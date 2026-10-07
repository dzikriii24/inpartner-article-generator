<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Models\SyncLog;
use App\Models\User;
use App\Support\Present;
use Illuminate\Support\Carbon;

class DashboardController extends Controller
{
    public function __invoke()
    {
        $paid = Order::where('payment_status', 'paid');

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

        return response()->json([
            'stats' => [
                'revenue' => (int) (clone $paid)->sum('total'),
                'revenue_month' => (int) (clone $paid)->where('paid_at', '>=', now()->startOfMonth())->sum('total'),
                'orders' => Order::count(),
                'paid_orders' => (clone $paid)->count(),
                'pending_orders' => Order::where('payment_status', 'pending')->count(),
                'customers' => User::where('role', 'customer')->count(),
                'products' => Product::count(),
                'published_products' => Product::where('status', 'published')->count(),
                'generator_products' => Product::fromGenerator()->count(),
                'generator_drafts' => Product::fromGenerator()->where('status', 'draft')->count(),
            ],
            'chart' => $chart,
            'recent_orders' => Order::with('items')->latest()->take(6)->get()->map(fn ($o) => Present::order($o, false)),
            'top_products' => Product::with('category', 'author')->where('sales_count', '>', 0)
                ->orderByDesc('sales_count')->take(5)->get()->map(fn ($p) => Present::productCard($p)),
            'awaiting_review' => Product::with('category', 'author')->fromGenerator()->where('status', 'draft')
                ->latest()->take(5)->get()->map(fn ($p) => Present::productAdmin($p)),
            'last_sync' => SyncLog::latest()->first(),
        ]);
    }
}
