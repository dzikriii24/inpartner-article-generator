<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Wishlists table
        if (!Schema::hasTable('wishlists')) {
            Schema::create('wishlists', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
                $table->timestamps();
                $table->unique(['user_id', 'product_id']);
            });
        }

        // 2. Reviews & Ratings table
        if (!Schema::hasTable('reviews')) {
            Schema::create('reviews', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
                $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
                $table->foreignId('order_id')->nullable()->constrained('orders')->nullOnDelete();
                $table->unsignedTinyInteger('rating')->default(5); // 1 - 5 stars
                $table->string('title', 200)->nullable();
                $table->text('comment')->nullable();
                $table->string('status', 20)->default('approved')->index(); // approved | pending | rejected
                $table->boolean('is_verified_buyer')->default(false);
                $table->unsignedInteger('helpful_count')->default(0);
                $table->timestamps();
                $table->index(['product_id', 'status']);
            });
        }

        // 3. Custom Analysis Requests table
        if (!Schema::hasTable('custom_requests')) {
            Schema::create('custom_requests', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
                $table->string('name', 150);
                $table->string('email', 190);
                $table->string('company', 200)->nullable();
                $table->string('phone', 40)->nullable();
                $table->string('sector', 100);
                $table->string('topic', 255);
                $table->text('scope');
                $table->string('budget_range', 100)->nullable();
                $table->string('timeline', 100)->nullable();
                $table->string('status', 30)->default('pending')->index(); // pending | in_review | quoted | in_progress | completed | cancelled
                $table->text('admin_notes')->nullable();
                $table->timestamps();
            });
        }

        // 4. Add B2B metadata columns to products
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'methodology')) {
                $table->text('methodology')->nullable()->after('sources');
            }
            if (!Schema::hasColumn('products', 'senior_partner')) {
                $table->string('senior_partner', 150)->nullable()->after('author_id');
            }
            if (!Schema::hasColumn('products', 'access_level')) {
                $table->string('access_level', 30)->default('entry')->after('access_type'); // free | entry | professional | enterprise
            }
            if (!Schema::hasColumn('products', 'excel_file_path')) {
                $table->string('excel_file_path')->nullable()->after('file_size');
                $table->string('excel_file_name')->nullable()->after('excel_file_path');
            }
        });

        // 5. Add Senior Partner metadata columns to authors
        Schema::table('authors', function (Blueprint $table) {
            if (!Schema::hasColumn('authors', 'is_senior_partner')) {
                $table->boolean('is_senior_partner')->default(false)->after('photo_url');
            }
            if (!Schema::hasColumn('authors', 'position')) {
                $table->string('position', 150)->nullable()->after('is_senior_partner');
            }
            if (!Schema::hasColumn('authors', 'affiliation')) {
                $table->string('affiliation', 150)->nullable()->after('position');
            }
            if (!Schema::hasColumn('authors', 'credentials')) {
                $table->string('credentials', 255)->nullable()->after('affiliation');
            }
            if (!Schema::hasColumn('authors', 'linkedin_url')) {
                $table->string('linkedin_url', 500)->nullable()->after('credentials');
            }
        });

        // 6. Add corporate billing columns to orders
        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'corporate_name')) {
                $table->string('corporate_name', 200)->nullable()->after('customer_phone');
            }
            if (!Schema::hasColumn('orders', 'tax_id')) {
                $table->string('tax_id', 60)->nullable()->after('corporate_name');
            }
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('custom_requests');
        Schema::dropIfExists('reviews');
        Schema::dropIfExists('wishlists');

        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn(['methodology', 'senior_partner', 'access_level', 'excel_file_path', 'excel_file_name']);
        });

        Schema::table('authors', function (Blueprint $table) {
            $table->dropColumn(['is_senior_partner', 'position', 'affiliation', 'credentials', 'linkedin_url']);
        });

        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn(['corporate_name', 'tax_id']);
        });
    }
};

