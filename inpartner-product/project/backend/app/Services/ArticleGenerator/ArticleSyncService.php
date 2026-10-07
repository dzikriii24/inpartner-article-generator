<?php

namespace App\Services\ArticleGenerator;

use App\Models\Author;
use App\Models\Category;
use App\Models\Product;
use App\Models\SyncLog;
use App\Support\Html;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Throwable;

/**
 * Keeps store products in sync with articles from the Article Generator.
 *
 * Ownership rules (who controls which field):
 *   GENERATOR (overwritten on every sync): title, subtitle, content, cover, reading time,
 *                                          sources, SEO, external_* fields
 *   STORE     (set once on import, then admin-owned): price, sale price, status, category,
 *                                          author, access type, featured flag, type
 *
 * New articles always arrive as DRAFT products so an admin can review & set a price
 * before publishing.
 */
class ArticleSyncService
{
    public function __construct(protected ArticleGeneratorClient $client) {}

    /**
     * Create or update a product from a full article payload (pull detail or push webhook).
     *
     * @return array{action: string, product: ?Product, reason?: string}
     */
    public function upsertFromPayload(array $a, bool $force = false): array
    {
        $externalId = (string) ($a['id'] ?? '');
        if ($externalId === '') {
            return ['action' => 'skipped', 'product' => null, 'reason' => 'missing id'];
        }

        $product = Product::fromGenerator()->where('external_id', $externalId)->first();
        $hash = (string) ($a['content_hash'] ?? '');
        $sellable = (bool) ($a['is_sellable'] ?? true);

        if (! $product && ! $sellable) {
            return ['action' => 'skipped', 'product' => null, 'reason' => 'article not ready ('.($a['status'] ?? '?').')'];
        }

        if ($product && ! $force && $hash !== '' && $product->external_hash === $hash) {
            $product->forceFill(['synced_at' => now(), 'sync_status' => 'synced', 'sync_error' => null])->save();

            return ['action' => 'skipped', 'product' => $product, 'reason' => 'unchanged'];
        }

        $contentHtml = Html::sanitize($a['content_html'] ?? '');
        $generatorFields = [
            'title' => Str::limit(trim((string) ($a['title'] ?? 'Untitled article')), 495, ''),
            'subtitle' => $a['subtitle'] ?? null,
            'excerpt' => Str::limit(trim((string) ($a['excerpt'] ?? $a['subtitle'] ?? '')), 600),
            'content_html' => $contentHtml,
            'preview_html' => Html::preview($contentHtml),
            'cover_caption' => isset($a['hero_image_caption']) ? Str::limit((string) $a['hero_image_caption'], 495, '') : null,
            'reading_time' => (int) ($a['reading_time'] ?? 0) ?: max(1, (int) ceil(Html::wordCount($contentHtml) / 220)),
            'word_count' => (int) ($a['word_count'] ?? Html::wordCount($contentHtml)),
            'seo' => $a['seo'] ?? null,
            'sources' => $a['sources'] ?? [],
            'external_status' => $a['status'] ?? null,
            'external_hash' => $hash ?: hash('sha256', $contentHtml),
            'external_pdf_url' => $a['export_urls']['pdf'] ?? null,
            'external_generated_at' => ! empty($a['generated_at']) ? Carbon::parse($a['generated_at']) : null,
            'synced_at' => now(),
            'sync_status' => 'synced',
            'sync_error' => null,
        ];

        $cover = $this->storeCover($a['hero_image_url'] ?? null, $externalId, $product?->cover_url);
        if ($cover !== false) {
            $generatorFields['cover_url'] = $cover;
        }

        if ($product) {
            $product->fill($generatorFields)->save();

            return ['action' => 'updated', 'product' => $product];
        }

        $product = Product::create(array_merge($generatorFields, [
            'source' => Product::SOURCE_GENERATOR,
            'external_id' => $externalId,
            'type' => 'article',
            'status' => 'draft',
            'price' => (int) config('services.article_generator.default_price', 25000),
            'access_type' => ! empty($generatorFields['external_pdf_url']) ? 'read_download' : 'read',
            'category_id' => Category::resolveByName($a['category'] ?? null)?->id,
            'author_id' => Author::resolveByName($a['author'] ?? 'Inpartner Editorial Board')?->id,
            'language' => 'en',
            'tags' => array_values(array_filter((array) ($a['seo']['keywords'] ?? []))),
        ]));

        return ['action' => 'created', 'product' => $product];
    }

    /**
     * Pull every sellable article; import new ones as drafts and refresh changed ones.
     */
    public function pullAll(string $trigger = 'manual'): SyncLog
    {
        $log = SyncLog::create([
            'direction' => 'pull', 'trigger' => $trigger, 'status' => 'success', 'started_at' => now(),
        ]);
        $counts = ['created' => 0, 'updated' => 0, 'skipped' => 0, 'failed' => 0];
        $errors = [];

        try {
            $summaries = $this->client->allArticleSummaries();
            $remoteIds = [];

            foreach ($summaries as $summary) {
                $remoteIds[] = (string) $summary['id'];
                try {
                    $existing = Product::fromGenerator()->where('external_id', (string) $summary['id'])->first();
                    if ($existing && $existing->external_hash === ($summary['content_hash'] ?? null)) {
                        $existing->forceFill(['synced_at' => now(), 'sync_status' => 'synced', 'sync_error' => null])->save();
                        $counts['skipped']++;

                        continue;
                    }
                    $full = $this->client->getArticle($summary['id']);
                    if (! $full) {
                        $counts['skipped']++;

                        continue;
                    }
                    $res = $this->upsertFromPayload($full);
                    $counts[$res['action']]++;
                } catch (Throwable $e) {
                    $counts['failed']++;
                    $errors[] = "#{$summary['id']}: ".$e->getMessage();
                    Log::warning('Article sync failed', ['id' => $summary['id'], 'error' => $e->getMessage()]);
                }
            }

            // Products whose article is no longer available in the generator.
            Product::fromGenerator()
                ->whereNotIn('external_id', $remoteIds ?: ['__none__'])
                ->where(fn ($q) => $q->whereNull('sync_status')->orWhere('sync_status', '!=', 'source_missing'))
                ->update(['sync_status' => 'source_missing', 'synced_at' => now()]);

            $status = $counts['failed'] > 0 ? 'partial' : 'success';
            $message = sprintf('%d remote articles checked.', count($summaries));
        } catch (Throwable $e) {
            $status = 'failed';
            $message = $e->getMessage();
            Log::error('Article generator pull failed', ['error' => $e->getMessage()]);
        }

        if ($errors) {
            $message .= ' Errors: '.implode(' | ', array_slice($errors, 0, 5));
        }

        $log->update([
            'status' => $status,
            'created_count' => $counts['created'],
            'updated_count' => $counts['updated'],
            'skipped_count' => $counts['skipped'],
            'failed_count' => $counts['failed'],
            'message' => Str::limit($message, 2000),
            'finished_at' => now(),
        ]);

        return $log->fresh();
    }

    /** Import / refresh specific generator article IDs (admin "Import selected"). */
    public function importIds(array $ids, string $trigger = 'import'): SyncLog
    {
        $log = SyncLog::create(['direction' => 'pull', 'trigger' => $trigger, 'status' => 'success', 'started_at' => now()]);
        $counts = ['created' => 0, 'updated' => 0, 'skipped' => 0, 'failed' => 0];
        $errors = [];

        foreach (array_unique($ids) as $id) {
            try {
                $full = $this->client->getArticle($id);
                if (! $full) {
                    $counts['failed']++;
                    $errors[] = "#{$id}: not found";

                    continue;
                }
                $res = $this->upsertFromPayload($full, force: true);
                $counts[$res['action']]++;
                if ($res['action'] === 'skipped' && isset($res['reason'])) {
                    $errors[] = "#{$id}: {$res['reason']}";
                }
            } catch (Throwable $e) {
                $counts['failed']++;
                $errors[] = "#{$id}: ".$e->getMessage();
            }
        }

        $log->update([
            'status' => $counts['failed'] ? ($counts['created'] + $counts['updated'] ? 'partial' : 'failed') : 'success',
            'created_count' => $counts['created'],
            'updated_count' => $counts['updated'],
            'skipped_count' => $counts['skipped'],
            'failed_count' => $counts['failed'],
            'message' => Str::limit(count($ids).' article(s) requested.'.($errors ? ' '.implode(' | ', $errors) : ''), 2000),
            'finished_at' => now(),
        ]);

        return $log->fresh();
    }

    /** Re-fetch a single product from the generator. */
    public function resync(Product $product): array
    {
        $full = $this->client->getArticle($product->external_id);
        if (! $full) {
            $product->update(['sync_status' => 'source_missing', 'synced_at' => now()]);

            return ['action' => 'missing', 'product' => $product];
        }

        return $this->upsertFromPayload($full, force: true);
    }

    /**
     * Persist the hero image. Remote URLs are kept as-is; base64 data URLs (images uploaded
     * in the generator editor) are written to the public disk.
     *
     * @return string|null|false  false = leave current cover untouched
     */
    protected function storeCover(?string $url, string $externalId, ?string $current): string|null|false
    {
        if (! $url) {
            return null;
        }
        if (! Str::startsWith($url, 'data:image/')) {
            return $url;
        }

        try {
            [$meta, $data] = explode(',', $url, 2);
            $ext = match (true) {
                str_contains($meta, 'png') => 'png',
                str_contains($meta, 'webp') => 'webp',
                str_contains($meta, 'gif') => 'gif',
                default => 'jpg',
            };
            $binary = base64_decode(urldecode($data), true);
            if ($binary === false) {
                return false;
            }
            $path = 'covers/generator-'.$externalId.'-'.substr(md5($binary), 0, 10).'.'.$ext;
            if ($current === $path) {
                return $path;
            }
            Storage::disk('public')->put($path, $binary);
            if ($current && Str::startsWith($current, 'covers/generator-'.$externalId.'-')) {
                Storage::disk('public')->delete($current);
            }

            return $path;
        } catch (Throwable $e) {
            Log::warning('Cover store failed', ['id' => $externalId, 'error' => $e->getMessage()]);

            return false;
        }
    }
}
