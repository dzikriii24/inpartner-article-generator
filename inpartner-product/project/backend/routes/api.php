<?php

use App\Http\Controllers\Api\Admin;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CartController;
use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\CmsController;
use App\Http\Controllers\Api\CustomRequestController;
use App\Http\Controllers\Api\IntegrationController;
use App\Http\Controllers\Api\LibraryController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\PaymentWebhookController;
use App\Http\Controllers\Api\ProfileDashboardController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\WishlistController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Inpartner Store API  (prefix: /api)
|--------------------------------------------------------------------------
*/

// ---------------------------------------------------------------- Public catalog & CMS
Route::get('/home', [CatalogController::class, 'home']);
Route::get('/cms/homepage', [CmsController::class, 'homepage']);
Route::get('/cms/settings', [CmsController::class, 'settings']);
Route::get('/search/suggestions', [CmsController::class, 'suggestions']);
Route::get('/products', [CatalogController::class, 'products']);
Route::get('/products/{slug}', [CatalogController::class, 'product']);
Route::get('/products/{slug}/reviews', [ReviewController::class, 'productReviews']);
Route::get('/categories', [CatalogController::class, 'categories']);
Route::get('/types', [CatalogController::class, 'types']);
Route::get('/authors/{slug}', [CatalogController::class, 'author']);
Route::get('/payment/config', [OrderController::class, 'paymentConfig']);
Route::post('/payment/simulator/{number}/pay', [OrderController::class, 'simulatePay']);
Route::post('/custom-requests', [CustomRequestController::class, 'store']);

// ---------------------------------------------------------------- Fallback Login Route for Sanctum
Route::get('/auth/login-prompt', fn () => response()->json(['message' => 'Unauthenticated.'], 401))->name('login');

// ---------------------------------------------------------------- Auth
Route::middleware('throttle:auth')->prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/forgot-password', [AuthController::class, 'forgotPassword']);
    Route::post('/reset-password', [AuthController::class, 'resetPassword']);
});

// ---------------------------------------------------------------- Payment gateway webhook
Route::post('/payments/midtrans/notification', [PaymentWebhookController::class, 'midtrans']);

// ---------------------------------------------------------------- Signed download & stream (bearer or query token)
Route::get('/library/download/{entitlement}', [LibraryController::class, 'download'])->name('library.download');
Route::get('/library/download-excel/{entitlement}', [LibraryController::class, 'downloadExcel'])->name('library.download_excel');
Route::get('/library/{slug}/stream-pdf', [LibraryController::class, 'streamPdf'])->name('library.stream_pdf');

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

    Route::get('/wishlist', [WishlistController::class, 'index']);
    Route::post('/wishlist/toggle/{productId}', [WishlistController::class, 'toggle'])->whereNumber('productId');
    Route::get('/wishlist/ids', [WishlistController::class, 'ids']);

    Route::post('/products/{slug}/reviews', [ReviewController::class, 'store']);
    Route::get('/custom-requests/my', [CustomRequestController::class, 'index']);

    Route::post('/checkout', [OrderController::class, 'checkout']);
    Route::get('/orders', [OrderController::class, 'index']);
    Route::get('/orders/{number}', [OrderController::class, 'show']);
    Route::post('/orders/{number}/refresh', [OrderController::class, 'refresh']);
    Route::post('/orders/{number}/simulate', [OrderController::class, 'simulate']);

    Route::get('/library', [LibraryController::class, 'index']);
    Route::get('/library/{slug}/read', [LibraryController::class, 'read']);
    Route::post('/library/{slug}/bookmark', [LibraryController::class, 'bookmark']);
    Route::post('/library/{slug}/star', [LibraryController::class, 'toggleStar']);
    Route::post('/library/{slug}/history/remove', [LibraryController::class, 'removeHistory']);
    Route::post('/library/{slug}/progress', [LibraryController::class, 'progress']);
    Route::post('/library/{slug}/download-link', [LibraryController::class, 'downloadLink']);
    Route::post('/library/{slug}/download-excel-link', [LibraryController::class, 'downloadExcelLink']);
    Route::post('/library/{slug}/highlight', [LibraryController::class, 'saveHighlight']);
    Route::delete('/library/{slug}/highlight/{highlightId}', [LibraryController::class, 'deleteHighlight']);
    Route::post('/library/{slug}/note', [LibraryController::class, 'saveNote']);
    Route::delete('/library/{slug}/note/{noteId}', [LibraryController::class, 'deleteNote']);
    Route::get('/library/{slug}/ai/chat', [LibraryController::class, 'getAiChats']);
    Route::post('/library/{slug}/ai/chat', [LibraryController::class, 'aiChat']);
    Route::delete('/library/{slug}/ai/chat', [LibraryController::class, 'clearAiChat']);
    Route::delete('/library/{slug}/ai/chat/{messageId}', [LibraryController::class, 'deleteAiMessage']);
    Route::post('/library/{slug}/ai/page-summary', [LibraryController::class, 'aiPageSummary']);

    // ------------------------------------------------------------ Personal Research Management Dashboard
    Route::prefix('profile')->group(function () {
        Route::get('/dashboard', [ProfileDashboardController::class, 'dashboard']);
        Route::get('/pipeline', [ProfileDashboardController::class, 'pipeline']);
        Route::post('/pipeline/{entitlementId}/move', [ProfileDashboardController::class, 'movePipelineItem'])->whereNumber('entitlementId');

        Route::get('/notebook', [ProfileDashboardController::class, 'notebook']);
        Route::post('/notebook/notes', [ProfileDashboardController::class, 'saveNotebookNote']);
        Route::delete('/notebook/notes/{noteId}', [ProfileDashboardController::class, 'deleteNotebookNote']);

        Route::get('/schedules', [ProfileDashboardController::class, 'schedules']);
        Route::post('/schedules', [ProfileDashboardController::class, 'storeSchedule']);
        Route::put('/schedules/{id}', [ProfileDashboardController::class, 'updateSchedule'])->whereNumber('id');
        Route::delete('/schedules/{id}', [ProfileDashboardController::class, 'deleteSchedule'])->whereNumber('id');

        Route::get('/activities', [ProfileDashboardController::class, 'activities']);
        Route::get('/analytics', [ProfileDashboardController::class, 'analytics']);

        Route::post('/avatar', [ProfileDashboardController::class, 'uploadAvatar']);
        Route::delete('/avatar', [ProfileDashboardController::class, 'deleteAvatar']);
        Route::put('/details', [ProfileDashboardController::class, 'updateDetails']);
        Route::put('/goals', [ProfileDashboardController::class, 'updateGoals']);
    });

    // ------------------------------------------------------------ Admin
    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::get('/dashboard', Admin\DashboardController::class);

        // CMS Storefront & Homepage Sections Management
        Route::get('/cms/sections', [CmsController::class, 'adminSections']);
        Route::post('/cms/sections', [CmsController::class, 'adminSaveSection']);
        Route::put('/cms/sections/{id}', [CmsController::class, 'adminSaveSection'])->whereNumber('id');
        Route::post('/cms/sections/reorder', [CmsController::class, 'adminReorder']);
        Route::patch('/cms/sections/{id}/toggle', [CmsController::class, 'adminToggle'])->whereNumber('id');
        Route::post('/cms/sections/publish', [CmsController::class, 'adminPublish']);
        Route::delete('/cms/sections/{id}', [CmsController::class, 'adminDeleteSection'])->whereNumber('id');
        Route::get('/cms/settings', [CmsController::class, 'adminGetSettings']);
        Route::put('/cms/settings', [CmsController::class, 'adminUpdateSettings']);

        Route::get('/products/meta', [Admin\ProductController::class, 'meta']);
        Route::post('/products/bulk', [Admin\ProductController::class, 'bulk']);
        Route::post('/products/{product}/cover', [Admin\ProductController::class, 'uploadCover']);
        Route::post('/products/{product}/file', [Admin\ProductController::class, 'uploadFile']);
        Route::post('/products/{product}/excel', [Admin\ProductController::class, 'uploadExcel']);
        Route::post('/products/{product}/resync', [Admin\ProductController::class, 'resync']);
        Route::apiResource('products', Admin\ProductController::class);

        Route::apiResource('categories', Admin\CategoryController::class)->except('show');
        Route::apiResource('authors', Admin\AuthorController::class)->except('show');
        Route::apiResource('banners', Admin\BannerController::class)->except('show');

        Route::get('/reviews', [ReviewController::class, 'adminIndex']);
        Route::patch('/reviews/{id}', [ReviewController::class, 'adminUpdateStatus'])->whereNumber('id');
        Route::delete('/reviews/{id}', [ReviewController::class, 'adminDestroy'])->whereNumber('id');

        Route::get('/custom-requests', [CustomRequestController::class, 'adminIndex']);
        Route::patch('/custom-requests/{id}', [CustomRequestController::class, 'adminUpdate'])->whereNumber('id');

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
