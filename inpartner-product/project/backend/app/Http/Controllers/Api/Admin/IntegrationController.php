<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\SyncLog;
use App\Services\ArticleGenerator\ArticleGeneratorClient;
use App\Services\ArticleGenerator\ArticleSyncService;
use Illuminate\Http\Request;
use Throwable;

/**
 * Admin screen for the Article Generator <-> Store connection.
 */
class IntegrationController extends Controller
{
    public function __construct(protected ArticleGeneratorClient $client, protected ArticleSyncService $sync) {}

    public function status()
    {
        $health = null;
        $error = null;
        if ($this->client->isConfigured()) {
            try {
                $health = $this->client->health();
            } catch (Throwable $e) {
                $error = $e->getMessage();
            }
        } else {
            $error = 'ARTICLE_GENERATOR_URL / ARTICLE_GENERATOR_KEY belum diisi di .env';
        }

        $gen = Product::fromGenerator();

        return response()->json([
            'configured' => $this->client->isConfigured(),
            'connected' => $health !== null,
            'generator_url' => $this->client->baseUrl(),
            'error' => $error,
            'health' => $health,
            'auto_sync' => (bool) config('services.article_generator.auto_sync'),
            'default_price' => (int) config('services.article_generator.default_price'),
            'webhook_url' => url('/api/integrations/article-generator/webhook'),
            'counts' => [
                'total' => (clone $gen)->count(),
                'draft' => (clone $gen)->where('status', 'draft')->count(),
                'published' => (clone $gen)->where('status', 'published')->count(),
                'source_missing' => (clone $gen)->where('sync_status', 'source_missing')->count(),
                'sales' => (int) (clone $gen)->sum('sales_count'),
            ],
            'logs' => SyncLog::latest()->take(15)->get(),
        ]);
    }

    public function sync()
    {
        $log = $this->sync->pullAll('manual');

        return response()->json(['log' => $log], $log->status === 'failed' ? 502 : 200);
    }

    /** Browse articles that exist in the generator, flagged with their store state. */
    public function remote(Request $request)
    {
        try {
            $res = $this->client->listArticles((int) $request->input('page', 1), 20, $request->input('q'), ! $request->boolean('all'));
        } catch (Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 502);
        }

        $ids = collect($res['data'] ?? [])->pluck('id')->map(fn ($id) => (string) $id);
        $products = Product::fromGenerator()->whereIn('external_id', $ids)->get()->keyBy('external_id');

        $res['data'] = collect($res['data'] ?? [])->map(function ($a) use ($products) {
            $p = $products->get((string) $a['id']);
            $a['store'] = $p ? [
                'product_id' => $p->id,
                'status' => $p->status,
                'price' => $p->finalPrice(),
                'up_to_date' => $p->external_hash === ($a['content_hash'] ?? null),
            ] : null;
            $a['editor_url'] = $this->client->editorUrl($a['id']);

            return $a;
        })->values();

        return response()->json($res);
    }

    public function import(Request $request)
    {
        $data = $request->validate(['ids' => ['required', 'array', 'min:1', 'max:50'], 'ids.*' => ['integer']]);
        $log = $this->sync->importIds($data['ids']);

        return response()->json(['log' => $log]);
    }
}
