<?php

namespace App\Services;

use App\Models\Order;
use App\Models\Payment;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;

/**
 * Payment gateway integration (Midtrans Snap) with a local simulator fallback.
 *
 * IMPORTANT: the order status is only ever changed from server-side sources
 * (webhook notification or server-to-server status query), never from the browser redirect.
 */
class PaymentService
{
    public function __construct(protected OrderService $orders) {}

    public function isSimulator(): bool
    {
        return blank(config('services.midtrans.server_key'));
    }

    public function provider(): string
    {
        return $this->isSimulator() ? 'simulator' : 'midtrans';
    }

    protected function snapBase(): string
    {
        return config('services.midtrans.is_production')
            ? 'https://app.midtrans.com/snap/v1'
            : 'https://app.sandbox.midtrans.com/snap/v1';
    }

    protected function coreBase(): string
    {
        return config('services.midtrans.is_production')
            ? 'https://api.midtrans.com/v2'
            : 'https://api.sandbox.midtrans.com/v2';
    }

    /** Create the payment session and store token/redirect URL on the order. */
    public function createTransaction(Order $order): Order
    {
        $frontend = config('services.frontend.url');

        if ($this->isSimulator()) {
            $order->update([
                'payment_provider' => 'simulator',
                'payment_token' => 'SIM-'.Str::upper(Str::random(16)),
                'payment_url' => $frontend.'/payment/simulator/'.$order->order_number,
            ]);

            return $order;
        }

        $order->loadMissing('items');
        $payload = [
            'transaction_details' => [
                'order_id' => $order->order_number,
                'gross_amount' => (int) $order->total,
            ],
            'item_details' => $order->items->map(fn ($i) => [
                'id' => (string) ($i->product_id ?? $i->id),
                'price' => (int) $i->final_price,
                'quantity' => 1,
                'name' => Str::limit($i->product_title, 45, '...'),
            ])->values()->all(),
            'customer_details' => array_filter([
                'first_name' => Str::limit($order->customer_name, 50, ''),
                'email' => $order->customer_email,
                'phone' => $order->customer_phone,
            ]),
            'callbacks' => [
                'finish' => $frontend.'/orders/'.$order->order_number.'?from=payment',
            ],
            'expiry' => [
                'unit' => 'minutes',
                'duration' => (int) config('services.midtrans.expiry_minutes', 60),
            ],
        ];

        $res = Http::withBasicAuth(config('services.midtrans.server_key'), '')
            ->acceptJson()
            ->timeout(20)
            ->post($this->snapBase().'/transactions', $payload);

        if (! $res->successful() || ! $res->json('token')) {
            throw new RuntimeException('Midtrans error: '.implode(', ', (array) ($res->json('error_messages') ?? [$res->body()])));
        }

        $order->update([
            'payment_provider' => 'midtrans',
            'payment_token' => $res->json('token'),
            'payment_url' => $res->json('redirect_url'),
        ]);

        return $order;
    }

    /** Midtrans HTTP notification (webhook). */
    public function handleMidtransNotification(array $payload): ?Order
    {
        $orderNumber = (string) ($payload['order_id'] ?? '');
        $order = Order::where('order_number', $orderNumber)->first();
        if (! $order) {
            return null;
        }

        $expected = hash('sha512',
            $orderNumber.($payload['status_code'] ?? '').($payload['gross_amount'] ?? '').config('services.midtrans.server_key')
        );
        $valid = hash_equals($expected, (string) ($payload['signature_key'] ?? ''));

        $this->logPayment($order, $payload, $valid);

        if (! $valid) {
            throw new RuntimeException('Invalid Midtrans signature.');
        }

        return $this->applyMidtransStatus($order, $payload);
    }

    /**
     * Server-to-server status check. Used when the user returns from the payment page
     * (and in local development where Midtrans cannot reach the webhook URL).
     */
    public function refreshStatus(Order $order): Order
    {
        if (! $order->isPending()) {
            return $order;
        }

        if ($order->payment_provider === 'simulator') {
            if ($order->expires_at && $order->expires_at->isPast()) {
                $this->orders->markExpired($order);
            }

            return $order->fresh();
        }

        if ($order->payment_provider !== 'midtrans' || $this->isSimulator()) {
            return $order;
        }

        $res = Http::withBasicAuth(config('services.midtrans.server_key'), '')
            ->acceptJson()->timeout(15)
            ->get($this->coreBase().'/'.$order->order_number.'/status');

        if ($res->successful() && $res->json('transaction_status')) {
            $this->logPayment($order, $res->json(), true);
            $this->applyMidtransStatus($order, $res->json());
        }

        return $order->fresh();
    }

    /** Simulator: emulates the gateway calling our webhook. */
    public function simulate(Order $order, string $result): Order
    {
        if (! $this->isSimulator() || $order->payment_provider !== 'simulator') {
            throw new RuntimeException('Payment simulator is disabled.');
        }

        $payload = [
            'order_id' => $order->order_number,
            'transaction_status' => $result === 'success' ? 'settlement' : ($result === 'expire' ? 'expire' : 'deny'),
            'payment_type' => 'simulator',
            'gross_amount' => $order->total.'.00',
            'transaction_id' => 'SIM-'.Str::uuid(),
        ];
        $this->logPayment($order, $payload, true);

        return $this->applyMidtransStatus($order, $payload);
    }

    protected function applyMidtransStatus(Order $order, array $p): Order
    {
        $status = $p['transaction_status'] ?? null;
        $fraud = $p['fraud_status'] ?? null;
        $method = $p['payment_type'] ?? null;

        if (isset($p['gross_amount']) && (int) round((float) $p['gross_amount']) !== (int) $order->total) {
            throw new RuntimeException('Gross amount mismatch for '.$order->order_number);
        }

        match (true) {
            $status === 'capture' && $fraud !== 'deny',
            $status === 'settlement' => $this->orders->markPaid($order, $method),
            in_array($status, ['deny', 'cancel', 'failure'], true),
            $status === 'capture' && $fraud === 'deny' => $this->orders->markFailed($order),
            $status === 'expire' => $this->orders->markExpired($order),
            in_array($status, ['refund', 'partial_refund'], true) => $this->orders->markRefunded($order),
            default => null, // pending / authorize: nothing to do
        };

        return $order->fresh();
    }

    protected function logPayment(Order $order, array $payload, bool $valid): void
    {
        Payment::create([
            'order_id' => $order->id,
            'provider' => $order->payment_provider,
            'transaction_id' => $payload['transaction_id'] ?? null,
            'transaction_status' => $payload['transaction_status'] ?? null,
            'payment_type' => $payload['payment_type'] ?? null,
            'fraud_status' => $payload['fraud_status'] ?? null,
            'gross_amount' => (int) round((float) ($payload['gross_amount'] ?? 0)),
            'signature_valid' => $valid,
            'payload' => $payload,
        ]);
    }
}
