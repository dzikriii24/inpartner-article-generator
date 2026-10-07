<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\PaymentService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Throwable;

class PaymentWebhookController extends Controller
{
    /** Midtrans HTTP Notification URL: POST /api/payments/midtrans/notification */
    public function midtrans(Request $request, PaymentService $payments)
    {
        try {
            $order = $payments->handleMidtransNotification($request->all());
            if (! $order) {
                return response()->json(['message' => 'Order not found'], 404);
            }

            return response()->json(['message' => 'OK', 'status' => $order->payment_status]);
        } catch (Throwable $e) {
            Log::warning('Midtrans notification rejected', ['error' => $e->getMessage(), 'payload' => $request->all()]);

            return response()->json(['message' => $e->getMessage()], 400);
        }
    }
}
