<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Core commerce schema for the Inpartner Store.
 *
 * Concept (see brainstorming/concept.md): a customer does not "buy a file",
 * they buy an ACCESS RIGHT (entitlement) to a digital product.
 *
 *   users -> orders -> order_items -> products -> entitlements (library) -> content
 *
 * All tables get the `store_` prefix from DB_PREFIX (shared DB with article-generator).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->string('name', 120);
            $table->string('slug', 140)->unique();
            $table->text('description')->nullable();
            $table->string('icon', 60)->nullable();
            $table->string('color', 20)->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });

        Schema::create('authors', function (Blueprint $table) {
            $table->id();
            $table->string('name', 150);
            $table->string('slug', 170)->unique();
            $table->text('bio')->nullable();
            $table->text('photo_url')->nullable();
            $table->timestamps();
        });

        Schema::create('products', function (Blueprint $table) {
            $table->id();
            // article | ebook | journal | research_paper | magazine | digital_file
            $table->string('type', 30)->default('article')->index();
            $table->string('title', 500);
            $table->string('slug', 220)->unique();
            $table->text('subtitle')->nullable();
            $table->longText('description')->nullable();
            $table->text('excerpt')->nullable();
            $table->longText('preview_html')->nullable();   // public teaser
            $table->longText('content_html')->nullable();   // protected: only via entitlement
            $table->text('cover_url')->nullable();
            $table->string('cover_caption', 500)->nullable();
            $table->foreignId('category_id')->nullable()->constrained('categories')->nullOnDelete();
            $table->foreignId('author_id')->nullable()->constrained('authors')->nullOnDelete();

            $table->unsignedInteger('price')->default(0);            // IDR
            $table->unsignedInteger('sale_price')->nullable();       // discounted price
            // draft | published | unpublished | archived
            $table->string('status', 20)->default('draft')->index();
            // read | download | read_download
            $table->string('access_type', 20)->default('read');

            $table->string('file_path')->nullable();    // private disk
            $table->string('file_name')->nullable();
            $table->unsignedBigInteger('file_size')->nullable();

            $table->unsignedSmallInteger('reading_time')->nullable();
            $table->unsignedInteger('word_count')->nullable();
            $table->unsignedInteger('pages')->nullable();
            $table->string('language', 10)->default('en');
            $table->boolean('is_featured')->default(false)->index();
            $table->unsignedInteger('sales_count')->default(0);
            $table->unsignedInteger('view_count')->default(0);
            $table->json('tags')->nullable();
            $table->json('seo')->nullable();
            $table->json('sources')->nullable();
            $table->timestamp('published_at')->nullable();

            // --- Integration with article-generator ---
            $table->string('source', 30)->default('manual')->index(); // manual | article_generator
            $table->string('external_id', 64)->nullable();
            $table->string('external_status', 30)->nullable();
            $table->string('external_hash', 64)->nullable();
            $table->text('external_pdf_url')->nullable();
            $table->timestamp('external_generated_at')->nullable();
            $table->timestamp('synced_at')->nullable();
            // synced | source_missing | error
            $table->string('sync_status', 30)->nullable();
            $table->text('sync_error')->nullable();

            $table->timestamps();

            $table->unique(['source', 'external_id']);
            $table->index(['status', 'published_at']);
        });

        Schema::create('cart_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'product_id']);
        });

        Schema::create('orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_number', 40)->unique();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->string('customer_name', 150);
            $table->string('customer_email', 190);
            $table->string('customer_phone', 30)->nullable();
            $table->unsignedInteger('subtotal')->default(0);
            $table->unsignedInteger('discount')->default(0);
            $table->unsignedInteger('total')->default(0);
            // pending | paid | failed | expired | refunded
            $table->string('payment_status', 20)->default('pending')->index();
            $table->string('payment_provider', 30)->default('simulator'); // midtrans | simulator | free
            $table->string('payment_method', 60)->nullable();
            $table->string('payment_token', 120)->nullable();
            $table->text('payment_url')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        Schema::create('order_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
            $table->string('product_title', 500);
            $table->string('product_type', 30);
            $table->unsignedInteger('price');        // normal price snapshot
            $table->unsignedInteger('final_price');  // price actually charged
            $table->timestamps();
        });

        // Every payment-gateway notification is logged here (audit trail for webhooks).
        Schema::create('payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
            $table->string('provider', 30);
            $table->string('transaction_id', 120)->nullable();
            $table->string('transaction_status', 40)->nullable();
            $table->string('payment_type', 60)->nullable();
            $table->string('fraud_status', 30)->nullable();
            $table->unsignedInteger('gross_amount')->default(0);
            $table->boolean('signature_valid')->default(false);
            $table->json('payload')->nullable();
            $table->timestamps();
        });

        // The heart of the system: user owns ACCESS to a product.
        Schema::create('entitlements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
            $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
            $table->string('source', 20)->default('purchase'); // purchase | grant
            $table->timestamp('granted_at');
            $table->timestamp('expires_at')->nullable();
            $table->timestamp('revoked_at')->nullable();
            $table->timestamp('last_accessed_at')->nullable();
            $table->unsignedSmallInteger('progress')->default(0); // reading progress %
            $table->timestamps();
            $table->unique(['user_id', 'product_id']);
        });

        Schema::create('banners', function (Blueprint $table) {
            $table->id();
            $table->string('eyebrow', 120)->nullable();
            $table->string('title', 200);
            $table->text('subtitle')->nullable();
            $table->text('image_url')->nullable();
            $table->string('cta_label', 60)->nullable();
            $table->string('cta_url', 500)->nullable();
            $table->string('theme', 30)->default('indigo');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('sync_logs', function (Blueprint $table) {
            $table->id();
            $table->string('direction', 10);  // pull | push
            $table->string('trigger', 20);    // manual | schedule | webhook | import
            $table->string('status', 20);     // success | partial | failed
            $table->unsignedInteger('created_count')->default(0);
            $table->unsignedInteger('updated_count')->default(0);
            $table->unsignedInteger('skipped_count')->default(0);
            $table->unsignedInteger('failed_count')->default(0);
            $table->text('message')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('finished_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sync_logs');
        Schema::dropIfExists('banners');
        Schema::dropIfExists('entitlements');
        Schema::dropIfExists('payments');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('cart_items');
        Schema::dropIfExists('products');
        Schema::dropIfExists('authors');
        Schema::dropIfExists('categories');
    }
};
