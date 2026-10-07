<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\SyncLog;
use App\Services\ArticleGenerator\ArticleSyncService;
use Illuminate\Http\Request;
use Throwable;

/**
 * Endpoints called BY the Article Generator (server-to-server, X-Integration-Key).
 */
class IntegrationController extends Controller
{
    /** POST /api/integrations/article-generator/webhook  ("Push to Store" button) */
    public function webhook(Request $request, ArticleSyncService $sync)
    {
        $data = $request->validate([
            'event' => ['required', 'string', 'in:article.upserted,article.deleted'],
            'article' => ['required', 'array'],
            'article.id' => ['required'],
        ]);

        $startedAt = now();

        if ($data['event'] === 'article.deleted') {
            $product = Product::fromGenerator()->where('external_id', (string) $data['article']['id'])->first();
            $product?->update(['sync_status' => 'source_missing', 'synced_at' => now()]);

            return response()->json(['message' => 'Marked as missing', 'listed' => (bool) $product]);
        }

        try {
            $res = $sync->upsertFromPayload($data['article'], force: true);
        } catch (Throwable $e) {
            SyncLog::create([
                'direction' => 'push', 'trigger' => 'webhook', 'status' => 'failed', 'failed_count' => 1,
                'message' => 'Article #'.$data['article']['id'].': '.$e->getMessage(), 'started_at' => $startedAt, 'finished_at' => now(),
            ]);
            report($e);

            return response()->json(['message' => 'Store failed to import article: '.$e->getMessage()], 500);
        }

        SyncLog::create([
            'direction' => 'push', 'trigger' => 'webhook',
            'status' => $res['product'] ? 'success' : 'failed',
            'created_count' => $res['action'] === 'created' ? 1 : 0,
            'updated_count' => $res['action'] === 'updated' ? 1 : 0,
            'skipped_count' => $res['action'] === 'skipped' ? 1 : 0,
            'message' => 'Article #'.$data['article']['id'].' '.$res['action'].(isset($res['reason']) ? ' ('.$res['reason'].')' : ''),
            'started_at' => $startedAt, 'finished_at' => now(),
        ]);

        if (! $res['product']) {
            return response()->json(['message' => $res['reason'] ?? 'Not imported'], 422);
        }

        return response()->json(array_merge(
            ['action' => $res['action'], 'message' => 'Article '.$res['action'].' in Inpartner Store.'],
            $this->productStatus($res['product'])
        ), $res['action'] === 'created' ? 201 : 200);
    }

    /** GET /api/integrations/article-generator/articles/{externalId} */
    public function show(string $externalId)
    {
        $product = Product::fromGenerator()->where('external_id', $externalId)->firstOrFail();

        return response()->json($this->productStatus($product));
    }

    protected function productStatus(Product $p): array
    {
        $frontend = config('services.frontend.url');

        return [
            'product_id' => $p->id,
            'slug' => $p->slug,
            'status' => $p->status,
            'price' => (int) $p->price,
            'final_price' => $p->finalPrice(),
            'sales_count' => (int) $p->sales_count,
            'sync_status' => $p->sync_status,
            'synced_at' => $p->synced_at?->toIso8601String(),
            'store_url' => $frontend.'/products/'.$p->slug,
            'admin_url' => $frontend.'/admin/products/'.$p->id,
        ];
    }
}
