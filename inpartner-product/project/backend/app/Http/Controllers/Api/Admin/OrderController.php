<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Services\OrderService;
use App\Services\PaymentService;
use App\Support\Present;
use Illuminate\Http\Request;
use Throwable;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $q = Order::with('items')
            ->when($request->input('status'), fn ($w, $s) => $w->where('payment_status', $s))
            ->when($request->input('q'), fn ($w, $t) => $w->where(fn ($s) => $s
                ->where('order_number', 'like', "%{$t}%")
                ->orWhere('customer_email', 'like', "%{$t}%")
                ->orWhere('customer_name', 'like', "%{$t}%")))
            ->latest();

        $page = $q->paginate((int) $request->input('per_page', 15));

        return response()->json([
            'data' => collect($page->items())->map(fn ($o) => Present::order($o, false)),
            'meta' => ['current_page' => $page->currentPage(), 'last_page' => $page->lastPage(), 'total' => $page->total()],
            'counts' => Order::selectRaw('payment_status, count(*) as total')->groupBy('payment_status')->pluck('total', 'payment_status'),
            'revenue' => (int) Order::where('payment_status', 'paid')->sum('total'),
        ]);
    }

    public function show(Order $order)
    {
        $order->load('items.product', 'payments', 'user');

        return response()->json([
            'order' => Present::order($order),
            'user' => $order->user ? Present::user($order->user) : null,
            'payments' => $order->payments()->latest()->get(['id', 'provider', 'transaction_id', 'transaction_status', 'payment_type', 'gross_amount', 'signature_valid', 'created_at']),
        ]);
    }

    public function refresh(Order $order, PaymentService $payments)
    {
        try {
            $payments->refreshStatus($order);
        } catch (Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 502);
        }

        return $this->show($order->fresh());
    }

    /** Manual override (e.g. bank transfer confirmed outside the gateway). */
    public function markPaid(Order $order, OrderService $orders)
    {
        $orders->markPaid($order, 'manual');

        return $this->show($order->fresh());
    }

    public function refund(Order $order, OrderService $orders)
    {
        $orders->markRefunded($order);

        return $this->show($order->fresh());
    }

    public function export(Request $request)
    {
        $rows = Order::with('items')
            ->when($request->input('status'), fn ($w, $s) => $w->where('payment_status', $s))
            ->latest()->get();

        $csv = fopen('php://temp', 'r+');
        fputcsv($csv, ['Order Number', 'Date', 'Customer', 'Email', 'Items', 'Subtotal', 'Discount', 'Total', 'Status', 'Provider', 'Method', 'Paid At']);
        foreach ($rows as $o) {
            fputcsv($csv, [
                $o->order_number, $o->created_at, $o->customer_name, $o->customer_email,
                $o->items->pluck('product_title')->implode(' | '), $o->subtotal, $o->discount, $o->total,
                $o->payment_status, $o->payment_provider, $o->payment_method, $o->paid_at,
            ]);
        }
        rewind($csv);

        return response(stream_get_contents($csv), 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => 'attachment; filename="orders-'.now()->format('Ymd-His').'.csv"',
        ]);
    }
}
