<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\SyncLog;
use App\Models\User;
use App\Support\Present;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;

class DashboardController extends Controller
{
    public function __invoke(Request $request)
    {
        $cacheKey = 'admin_dashboard_summary';
        if ($request->boolean('refresh')) {
            Cache::forget($cacheKey);
        }

        $data = Cache::remember($cacheKey, 20, function () {
            // Revenue for the last 14 days
            $from = now()->subDays(13)->startOfDay();
            $daily = Order::where('payment_status', 'paid')->where('paid_at', '>=', $from)
                ->get(['paid_at', 'total'])
                ->groupBy(fn ($o) => $o->paid_at->format('Y-m-d'))
                ->map(fn ($g) => ['revenue' => (int) $g->sum('total'), 'orders' => $g->count()]);

            $chart = collect(range(0, 13))->map(function ($i) use ($from, $daily) {
                $d = Carbon::parse($from)->addDays($i)->format('Y-m-d');

                return ['date' => $d, 'revenue' => $daily[$d]['revenue'] ?? 0, 'orders' => $daily[$d]['orders'] ?? 0];
            });

            // Single aggregate query for orders
            $startOfMonth = now()->startOfMonth();
            $orderStats = Order::query()
                ->selectRaw("
                    COUNT(id) as total_orders,
                    COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN total ELSE 0 END), 0) as revenue,
                    COALESCE(SUM(CASE WHEN payment_status = 'paid' AND paid_at >= ? THEN total ELSE 0 END), 0) as revenue_month,
                    COALESCE(SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END), 0) as paid_orders,
                    COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END), 0) as pending_orders
                ", [$startOfMonth])
                ->first();

            // Single aggregate query for products
            $productStats = Product::query()
                ->selectRaw("
                    COUNT(id) as total_products,
                    COALESCE(SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END), 0) as published_products,
                    COALESCE(SUM(CASE WHEN source = 'article_generator' THEN 1 ELSE 0 END), 0) as generator_products,
                    COALESCE(SUM(CASE WHEN source = 'article_generator' AND status = 'draft' THEN 1 ELSE 0 END), 0) as generator_drafts
                ")
                ->first();

            $customerCount = User::where('role', 'customer')->count();

            return [
                'stats' => [
                    'revenue' => (int) ($orderStats->revenue ?? 0),
                    'revenue_month' => (int) ($orderStats->revenue_month ?? 0),
                    'orders' => (int) ($orderStats->total_orders ?? 0),
                    'paid_orders' => (int) ($orderStats->paid_orders ?? 0),
                    'pending_orders' => (int) ($orderStats->pending_orders ?? 0),
                    'customers' => $customerCount,
                    'products' => (int) ($productStats->total_products ?? 0),
                    'published_products' => (int) ($productStats->published_products ?? 0),
                    'generator_products' => (int) ($productStats->generator_products ?? 0),
                    'generator_drafts' => (int) ($productStats->generator_drafts ?? 0),
                ],
                'chart' => $chart,
                'recent_orders' => Order::with('items')->latest()->take(6)->get()->map(fn ($o) => Present::order($o, false))->all(),
                'top_products' => Product::with('category', 'author')->where('sales_count', '>', 0)
                    ->orderByDesc('sales_count')->take(5)->get()->map(fn ($p) => Present::productCard($p))->all(),
                'awaiting_review' => Product::with('category', 'author')->fromGenerator()->where('status', 'draft')
                    ->latest()->take(5)->get()->map(fn ($p) => Present::productAdmin($p))->all(),
                'last_sync' => SyncLog::latest()->first(),
            ];
        });

        return response()->json($data);
    }
}
