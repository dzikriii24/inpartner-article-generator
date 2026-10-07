<?php

namespace App\Notifications;

use App\Models\Order;
use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class OrderPaidNotification extends Notification
{
    use Queueable;

    public function __construct(public Order $order) {}

    public function via(object $notifiable): array
    {
        return ['mail'];
    }

    public function toMail(object $notifiable): MailMessage
    {
        $frontend = config('services.frontend.url');
        $mail = (new MailMessage)
            ->subject('Pembayaran berhasil — '.$this->order->order_number)
            ->greeting('Halo '.$notifiable->name.',')
            ->line('Terima kasih! Pembayaran untuk pesanan **'.$this->order->order_number.'** sudah kami terima.')
            ->line('Produk berikut sudah tersedia di **Library** kamu:');

        foreach ($this->order->items as $item) {
            $mail->line('• '.$item->product_title.' — Rp'.number_format($item->final_price, 0, ',', '.'));
        }

        return $mail
            ->line('Total: **Rp'.number_format($this->order->total, 0, ',', '.').'**')
            ->action('Buka Library', $frontend.'/library')
            ->line('Selamat membaca!');
    }
}
