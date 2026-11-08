<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Site Settings table (global config: brand, navbar, footer, SEO)
        if (!Schema::hasTable('site_settings')) {
            Schema::create('site_settings', function (Blueprint $table) {
                $table->id();
                $table->string('key', 100)->unique();
                $table->longText('value')->nullable();
                $table->string('group', 50)->default('general')->index();
                $table->boolean('is_public')->default(true);
                $table->timestamps();
            });
        }

        // 2. CMS Homepage Sections table
        if (!Schema::hasTable('cms_sections')) {
            Schema::create('cms_sections', function (Blueprint $table) {
                $table->id();
                $table->string('key', 80)->unique();
                $table->string('type', 50)->index();
                $table->string('title', 255);
                $table->text('subtitle')->nullable();
                $table->json('content')->nullable();
                $table->json('settings')->nullable();
                $table->unsignedInteger('sort_order')->default(0);
                $table->boolean('is_active')->default(true);
                $table->boolean('is_published')->default(true);
                $table->json('draft_content')->nullable();
                $table->timestamps();
            });
        }

        // 3. CMS Section Translations table (id, en, ko)
        if (!Schema::hasTable('cms_section_translations')) {
            Schema::create('cms_section_translations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('cms_section_id')->constrained('cms_sections')->cascadeOnDelete();
                $table->string('locale', 10)->index();
                $table->string('title', 255)->nullable();
                $table->text('subtitle')->nullable();
                $table->json('content')->nullable();
                $table->timestamps();
                $table->unique(['cms_section_id', 'locale']);
            });
        }

        // 4. Add Reader progress and bookmarks to entitlements
        Schema::table('entitlements', function (Blueprint $table) {
            if (!Schema::hasColumn('entitlements', 'last_read_page')) {
                $table->unsignedSmallInteger('last_read_page')->default(1)->after('progress');
            }
            if (!Schema::hasColumn('entitlements', 'bookmarks')) {
                $table->json('bookmarks')->nullable()->after('last_read_page');
            }
            if (!Schema::hasColumn('entitlements', 'notes')) {
                $table->json('notes')->nullable()->after('bookmarks');
            }
        });

        // 5. Add Structured Content and Multilingual fields to products
        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'publisher')) {
                $table->string('publisher', 150)->nullable()->after('author_id');
            }
            if (!Schema::hasColumn('products', 'chapters')) {
                $table->json('chapters')->nullable()->after('preview_html');
            }
            if (!Schema::hasColumn('products', 'translations')) {
                $table->json('translations')->nullable()->after('sources');
            }
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            if (Schema::hasColumn('products', 'translations')) $table->dropColumn('translations');
            if (Schema::hasColumn('products', 'chapters')) $table->dropColumn('chapters');
            if (Schema::hasColumn('products', 'publisher')) $table->dropColumn('publisher');
        });

        Schema::table('entitlements', function (Blueprint $table) {
            if (Schema::hasColumn('entitlements', 'notes')) $table->dropColumn('notes');
            if (Schema::hasColumn('entitlements', 'bookmarks')) $table->dropColumn('bookmarks');
            if (Schema::hasColumn('entitlements', 'last_read_page')) $table->dropColumn('last_read_page');
        });

        Schema::dropIfExists('cms_section_translations');
        Schema::dropIfExists('cms_sections');
        Schema::dropIfExists('site_settings');
    }
};

