<?php

use App\Services\ArticleGenerator\ArticleSyncService;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

/*
| Pull new / changed articles from the Article Generator.
|   php artisan store:sync-articles
| Runs automatically every 15 minutes via the scheduler:
|   php artisan schedule:work            (development)
|   * * * * * php artisan schedule:run   (production cron)
*/
Artisan::command('store:sync-articles {--trigger=manual}', function (ArticleSyncService $sync) {
    $this->info('Syncing articles from Article Generator...');
    $log = $sync->pullAll((string) $this->option('trigger'));
    $this->table(
        ['Status', 'Created', 'Updated', 'Skipped', 'Failed'],
        [[$log->status, $log->created_count, $log->updated_count, $log->skipped_count, $log->failed_count]]
    );
    $this->line((string) $log->message);

    return $log->status === 'failed' ? 1 : 0;
})->purpose('Pull articles from the Inpartner Article Generator into the store as draft products');

/*
| Expire unpaid orders.
*/
Artisan::command('store:expire-orders', function () {
    $count = \App\Models\Order::where('payment_status', 'pending')
        ->whereNotNull('expires_at')->where('expires_at', '<', now()->subMinutes(5))
        ->update(['payment_status' => 'expired']);
    $this->info("{$count} order(s) expired.");
})->purpose('Mark pending orders past their payment window as expired');

if (config('services.article_generator.auto_sync')) {
    Schedule::command('store:sync-articles --trigger=schedule')->everyFifteenMinutes()->withoutOverlapping();
}
Schedule::command('store:expire-orders')->everyTenMinutes();
