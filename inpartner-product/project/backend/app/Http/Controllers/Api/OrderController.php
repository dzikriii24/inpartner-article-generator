<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Product;
use App\Services\OrderService;
use App\Services\PaymentService;
use App\Support\Present;
use Illuminate\Http\Request;
use Throwable;

class OrderController extends Controller
{
    public function __construct(protected OrderService $orders, protected PaymentService $payments) {}

    /** Checkout: from explicit product_ids ("Buy now") or from the whole cart. */
    public function checkout(Request $request)
    {
        $data = $request->validate([
            'product_ids' => ['nullable', 'array'],
            'product_ids.*' => ['integer'],
            'phone' => ['nullable', 'string', 'max:30'],
        ]);
        $user = $request->user();

        $ids = ! empty($data['product_ids'])
            ? $data['product_ids']
            : $user->cartItems()->pluck('product_id')->all();

        $products = Product::whereIn('id', $ids)->get();
        $order = $this->orders->create($user, $products, $data['phone'] ?? null);

        if ($order->isPending()) {
            try {
                $order = $this->payments->createTransaction($order);
            } catch (Throwable $e) {
                report($e);
                $order->update(['payment_status' => 'failed', 'notes' => $e->getMessage()]);

                return response()->json(['message' => 'Gagal membuat pembayaran: '.$e->getMessage()], 502);
            }
        }

        return response()->json([
            'order' => Present::order($order->load('items')),
            'payment' => [
                'provider' => $order->payment_provider,
                'token' => $order->isPending() ? $order->payment_token : null,
                'redirect_url' => $order->isPending() ? $order->payment_url : null,
                'client_key' => config('services.midtrans.client_key'),
                'is_production' => (bool) config('services.midtrans.is_production'),
            ],
        ], 201);
    }

    public function index(Request $request)
    {
        $orders = $request->user()->orders()->with('items')->latest()
            ->when($request->input('status'), fn ($q, $s) => $q->where('payment_status', $s))
            ->paginate(10);

        return response()->json([
            'data' => collect($orders->items())->map(fn ($o) => Present::order($o)),
            'meta' => ['current_page' => $orders->currentPage(), 'last_page' => $orders->lastPage(), 'total' => $orders->total()],
        ]);
    }

    public function show(Request $request, string $number)
    {
        $order = $request->user()->orders()->where('order_number', $number)->with('items.product')->firstOrFail();

        return response()->json(['order' => Present::order($order)]);
    }

    /** Server-side payment status refresh (never trusts the browser redirect). */
    public function refresh(Request $request, string $number)
    {
        $order = $request->user()->orders()->where('order_number', $number)->firstOrFail();
        try {
            $order = $this->payments->refreshStatus($order);
        } catch (Throwable $e) {
            report($e);
        }

        return response()->json(['order' => Present::order($order->load('items.product'))]);
    }

    /** Simulator payment page actions (only when Midtrans keys are not configured). */
    public function simulate(Request $request, string $number)
    {
        $data = $request->validate(['result' => ['required', 'in:success,failed,expire']]);
        $order = $request->user()->orders()->where('order_number', $number)->firstOrFail();

        if (! $order->isPending()) {
            return response()->json(['message' => 'Order sudah tidak pending.', 'order' => Present::order($order->load('items'))], 422);
        }

        try {
            $order = $this->payments->simulate($order, $data['result']);
        } catch (Throwable $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['order' => Present::order($order->load('items.product'))]);
    }

    public function paymentConfig()
    {
        return response()->json([
            'provider' => $this->payments->provider(),
            'simulator' => $this->payments->isSimulator(),
            'client_key' => config('services.midtrans.client_key'),
            'is_production' => (bool) config('services.midtrans.is_production'),
        ]);
    }
}
