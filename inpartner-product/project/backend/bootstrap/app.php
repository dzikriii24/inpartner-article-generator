<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        apiPrefix: env('LARAVEL_API_PREFIX', ''),
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        $middleware->redirectGuestsTo(fn () => null);
        $middleware->alias([
            'admin' => \App\Http\Middleware\EnsureAdmin::class,
            'active' => \App\Http\Middleware\EnsureActiveUser::class,
            'integration' => \App\Http\Middleware\VerifyIntegrationKey::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions) {
        // The store backend is a pure JSON API for the React SPA.
        $exceptions->shouldRenderJsonWhen(fn (Request $request) => true);
    })->create();
