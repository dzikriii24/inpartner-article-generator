<?php

namespace App\Services;

use App\Models\CartItem;
use App\Models\Entitlement;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use App\Notifications\OrderPaidNotification;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Order lifecycle:  pending -> paid (grant entitlements) | failed | expired -> refunded (revoke)
 */
class OrderService
{
    /**
     * @param  Collection<int, Product>  $products
     */
    public function create(User $user, Collection $products, ?string $phone = null): Order
    {
        $products = $products->unique('id')->values();

        if ($products->isEmpty()) {
            throw ValidationException::withMessages(['products' => 'Tidak ada produk untuk di-checkout.']);
        }

        $unavailable = $products->filter(fn (Product $p) => $p->status !== 'published');
        if ($unavailable->isNotEmpty()) {
            throw ValidationException::withMessages(['products' => 'Produk tidak tersedia: '.$unavailable->pluck('title')->implode(', ')]);
        }

        $owned = Entitlement::where('user_id', $user->id)->active()
            ->whereIn('product_id', $products->pluck('id'))->pluck('product_id');
        if ($owned->isNotEmpty()) {
            throw ValidationException::withMessages([
                'products' => 'Kamu sudah memiliki: '.$products->whereIn('id', $owned)->pluck('title')->implode(', '),
            ]);
        }

        $subtotal = (int) $products->sum('price');
        $total = (int) $products->sum(fn (Product $p) => $p->finalPrice());

        $order = DB::transaction(function () use ($user, $products, $subtotal, $total, $phone) {
            $order = Order::create([
                'order_number' => Order::generateNumber(),
                'user_id' => $user->id,
                'customer_name' => $user->name,
                'customer_email' => $user->email,
                'customer_phone' => $phone ?: $user->phone,
                'subtotal' => $subtotal,
                'discount' => max(0, $subtotal - $total),
                'total' => $total,
                'payment_status' => 'pending',
                'payment_provider' => $total === 0 ? 'free' : 'simulator',
                'expires_at' => now()->addMinutes((int) config('services.midtrans.expiry_minutes', 60)),
            ]);

            foreach ($products as $p) {
                $order->items()->create([
                    'product_id' => $p->id,
                    'product_title' => $p->title,
                    'product_type' => $p->type,
                    'price' => (int) $p->price,
                    'final_price' => $p->finalPrice(),
                ]);
            }

            return $order;
        });

        if ($total === 0) {
            $this->markPaid($order, 'free');
        }

        return $order->fresh('items');
    }

    /** Idempotent: safe to call multiple times (webhook retries). */
    public function markPaid(Order $order, ?string $method = null): Order
    {
        $justPaid = false;

        DB::transaction(function () use ($order, $method, &$justPaid) {
            $locked = Order::whereKey($order->id)->lockForUpdate()->first();
            if ($locked->payment_status === 'paid') {
                return;
            }
            if (! in_array($locked->payment_status, ['pending', 'expired', 'failed'], true)) {
                return; // refunded orders are never re-opened
            }

            $locked->update([
                'payment_status' => 'paid',
                'payment_method' => $method ?: $locked->payment_method,
                'paid_at' => now(),
            ]);

            foreach ($locked->items()->whereNotNull('product_id')->get() as $item) {
                Entitlement::updateOrCreate(
                    ['user_id' => $locked->user_id, 'product_id' => $item->product_id],
                    ['order_id' => $locked->id, 'source' => 'purchase', 'granted_at' => now(), 'revoked_at' => null, 'expires_at' => null]
                );
                Product::whereKey($item->product_id)->increment('sales_count');
            }

            CartItem::where('user_id', $locked->user_id)
                ->whereIn('product_id', $locked->items()->pluck('product_id'))
                ->delete();

            $justPaid = true;
        });

        if ($justPaid) {
            try {
                $order->refresh()->user?->notify(new OrderPaidNotification($order->load('items')));
            } catch (Throwable $e) {
                Log::warning('Order paid notification failed', ['order' => $order->order_number, 'error' => $e->getMessage()]);
            }
        }

        return $order->fresh();
    }

    public function markFailed(Order $order): Order
    {
        Order::whereKey($order->id)->where('payment_status', 'pending')->update(['payment_status' => 'failed']);

        return $order->fresh();
    }

    public function markExpired(Order $order): Order
    {
        Order::whereKey($order->id)->where('payment_status', 'pending')->update(['payment_status' => 'expired']);

        return $order->fresh();
    }

    public function markRefunded(Order $order): Order
    {
        DB::transaction(function () use ($order) {
            $locked = Order::whereKey($order->id)->lockForUpdate()->first();
            if ($locked->payment_status !== 'paid') {
                return;
            }
            $locked->update(['payment_status' => 'refunded']);
            Entitlement::where('order_id', $locked->id)->update(['revoked_at' => now()]);
        });

        return $order->fresh();
    }
}
