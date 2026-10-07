<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // The database is SHARED with article-generator. `migrate:fresh`, `migrate:refresh`,
        // `migrate:reset` and `db:wipe` drop EVERY table in the database (not only store_*),
        // which would destroy the generator data. Block them permanently.
        DB::prohibitDestructiveCommands(true);

        JsonResource::withoutWrapping();

        // Password reset links point to the Vue SPA.
        ResetPassword::createUrlUsing(function ($user, string $token) {
            return config('services.frontend.url').'/reset-password?token='.$token.'&email='.urlencode($user->email);
        });

        RateLimiter::for('auth', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));
        RateLimiter::for('api', fn (Request $request) => Limit::perMinute(120)->by($request->user()?->id ?: $request->ip()));
    }
}
