<?php

namespace App\Services\ArticleGenerator;

use Illuminate\Http\Client\PendingRequest;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * HTTP client for the Inpartner Article Generator "store" API.
 * (article-generator/project/api/store_routes.py)
 */
class ArticleGeneratorClient
{
    public function isConfigured(): bool
    {
        return filled(config('services.article_generator.url')) && filled(config('services.article_generator.key'));
    }

    public function baseUrl(): string
    {
        return (string) config('services.article_generator.url');
    }

    protected function http(): PendingRequest
    {
        if (! $this->isConfigured()) {
            throw new RuntimeException('Article generator integration is not configured (ARTICLE_GENERATOR_URL / ARTICLE_GENERATOR_KEY).');
        }

        return Http::baseUrl($this->baseUrl())
            ->acceptJson()
            ->withHeaders([
                'X-Integration-Key' => config('services.article_generator.key'),
                'User-Agent' => 'InpartnerStore/1.0',
            ])
            ->timeout((int) config('services.article_generator.timeout', 20))
            ->retry(2, 300, throw: false);
    }

    public function health(): array
    {
        $res = $this->http()->get('/api/v1/store/health');
        if (! $res->successful()) {
            throw new RuntimeException('Generator health check failed: HTTP '.$res->status());
        }

        return $res->json();
    }

    /** @return array{data: array<int, array>, meta: array} */
    public function listArticles(int $page = 1, int $perPage = 50, ?string $q = null, bool $sellableOnly = true): array
    {
        $res = $this->http()->get('/api/v1/store/articles', array_filter([
            'page' => $page,
            'per_page' => $perPage,
            'q' => $q,
            'sellable_only' => $sellableOnly ? 'true' : 'false',
        ], fn ($v) => $v !== null && $v !== ''));

        if (! $res->successful()) {
            throw new RuntimeException('Failed to list generator articles: HTTP '.$res->status().' '.substr($res->body(), 0, 200));
        }

        return $res->json();
    }

    /** Iterate every page of sellable articles. */
    public function allArticleSummaries(): array
    {
        $all = [];
        $page = 1;
        do {
            $chunk = $this->listArticles($page, 100);
            $all = array_merge($all, $chunk['data'] ?? []);
            $last = (int) ($chunk['meta']['last_page'] ?? 1);
            $page++;
        } while ($page <= $last && $page < 200);

        return $all;
    }

    /** Full article payload, or null when it no longer exists. */
    public function getArticle(int|string $id): ?array
    {
        $res = $this->http()->get("/api/v1/store/articles/{$id}");
        if ($res->status() === 404) {
            return null;
        }
        if (! $res->successful()) {
            throw new RuntimeException("Failed to fetch generator article #{$id}: HTTP ".$res->status());
        }

        return $res->json('data');
    }

    /** Link to the article editor inside the generator app. */
    public function editorUrl(int|string $id): string
    {
        return $this->baseUrl().'/article/'.$id;
    }
}
