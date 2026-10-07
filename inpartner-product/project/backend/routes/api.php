<?php

use App\Http\Controllers\Api\Admin;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\IntegrationController;
use App\Http\Controllers\Api\LibraryController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentWebhookController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Inpartner Store API  (prefix: /api)
|--------------------------------------------------------------------------
*/

// ---------------------------------------------------------------- Public catalog
Route::get('/home', [CatalogController::class, 'home']);
Route::get('/products', [CatalogController::class, 'products']);
Route::get('/products/{slug}', [CatalogController::class, 'product']);
Route::get('/categories', [CatalogController::class, 'categories']);
Route::get('/types', [CatalogController::class, 'types']);
Route::get('/authors/{slug}', [CatalogController::class, 'author']);
Route::get('/payment/config', [OrderController::class, 'paymentConfig']);

// ---------------------------------------------------------------- Auth
Route::middleware('throttle:auth')->prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
});

// ---------------------------------------------------------------- Payment gateway webhook
Route::post('/payments/midtrans/notification', [PaymentWebhookController::class, 'midtrans']);

// ---------------------------------------------------------------- Signed download (no bearer token)
Route::get('/library/download/{entitlement}', [LibraryController::class, 'download'])->name('library.download');

// ---------------------------------------------------------------- Article Generator (server-to-server)
Route::middleware('integration')->prefix('integrations/article-generator')->group(function () {
    Route::post('/webhook', [IntegrationController::class, 'webhook']);
    Route::get('/articles/{externalId}', [IntegrationController::class, 'show']);
});

// ---------------------------------------------------------------- Customer (authenticated)
Route::middleware(['auth:sanctum', 'active'])->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::put('/auth/profile', [AuthController::class, 'updateProfile']);
    Route::put('/auth/password', [AuthController::class, 'changePassword']);

    Route::get('/cart', [CartController::class, 'index']);
    Route::post('/cart', [CartController::class, 'store']);
    Route::delete('/cart', [CartController::class, 'clear']);
    Route::delete('/cart/{productId}', [CartController::class, 'destroy'])->whereNumber('productId');

    Route::post('/checkout', [OrderController::class, 'checkout']);
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{number}', [OrderController::class, 'show']);
    Route::post('/orders/{number}/refresh', [OrderController::class, 'refresh']);
    Route::post('/orders/{number}/simulate', [OrderController::class, 'simulate']);

    Route::get('/library', [LibraryController::class, 'index']);
    Route::get('/library/{slug}/read', [LibraryController::class, 'read']);
    Route::post('/library/{slug}/progress', [LibraryController::class, 'progress']);
    Route::post('/library/{slug}/download-link', [LibraryController::class, 'downloadLink']);

    // ------------------------------------------------------------ Admin
    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/dashboard', Admin\DashboardController::class);

        Route::get('/products/meta', [Admin\ProductController::class, 'meta']);
        Route::post('/products/bulk', [Admin\ProductController::class, 'bulk']);
        Route::post('/products/{product}/cover', [Admin\ProductController::class, 'uploadCover']);
        Route::post('/products/{product}/file', [Admin\ProductController::class, 'uploadFile']);
        Route::post('/products/{product}/resync', [Admin\ProductController::class, 'resync']);
        Route::apiResource('products', Admin\ProductController::class);

        Route::apiResource('categories', Admin\CategoryController::class)->except('show');
        Route::apiResource('authors', Admin\AuthorController::class)->except('show');
        Route::apiResource('banners', Admin\BannerController::class)->except('show');

        Route::get('/orders/export', [Admin\OrderController::class, 'export']);
        Route::get('/orders', [Admin\OrderController::class, 'index']);
        Route::get('/orders/{order}', [Admin\OrderController::class, 'show']);
        Route::post('/orders/{order}/refresh', [Admin\OrderController::class, 'refresh']);
        Route::post('/orders/{order}/mark-paid', [Admin\OrderController::class, 'markPaid']);
        Route::post('/orders/{order}/refund', [Admin\OrderController::class, 'refund']);

        Route::get('/users', [Admin\UserController::class, 'index']);
        Route::get('/users/{user}', [Admin\UserController::class, 'show']);
        Route::patch('/users/{user}', [Admin\UserController::class, 'update']);
        Route::post('/users/{user}/grant', [Admin\UserController::class, 'grant']);
        Route::delete('/users/{user}/entitlements/{entitlement}', [Admin\UserController::class, 'revoke']);

        Route::get('/integration', [Admin\IntegrationController::class, 'status']);
        Route::post('/integration/sync', [Admin\IntegrationController::class, 'sync']);
        Route::get('/integration/remote', [Admin\IntegrationController::class, 'remote']);
        Route::post('/integration/import', [Admin\IntegrationController::class, 'import']);
    });
});
