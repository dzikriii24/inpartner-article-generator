<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('cms_pages')) {
            Schema::create('cms_pages', function (Blueprint $table) {
                $table->id();
                $table->string('slug', 80)->unique();
                $table->string('title', 180)->default('Homepage');
                $table->unsignedInteger('version')->default(1);
                $table->longText('draft_tree')->nullable();
                $table->longText('published_tree')->nullable();
                $table->timestamp('draft_updated_at')->nullable();
                $table->timestamp('published_at')->nullable();
                $table->unsignedBigInteger('updated_by')->nullable();
                $table->unsignedBigInteger('published_by')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('cms_revisions')) {
            Schema::create('cms_revisions', function (Blueprint $table) {
                $table->id();
                $table->string('page_slug', 80)->index();
                $table->unsignedInteger('version')->default(1);
                $table->string('status', 30)->default('draft')->index(); // draft | published | autosave | restore_point
                $table->string('label', 180)->nullable();
                $table->longText('snapshot');
                $table->unsignedBigInteger('created_by')->nullable();
                $table->string('created_by_name', 120)->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('cms_templates')) {
            Schema::create('cms_templates', function (Blueprint $table) {
                $table->id();
                $table->string('uid', 80)->unique();
                $table->string('name', 150);
                $table->string('category', 60)->default('general')->index();
                $table->text('description')->nullable();
                $table->string('thumbnail_type', 60)->nullable();
                $table->longText('section_data');
                $table->boolean('is_system')->default(false);
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('cms_media')) {
            Schema::create('cms_media', function (Blueprint $table) {
                $table->id();
                $table->string('uid', 80)->unique();
                $table->string('file_name', 255);
                $table->string('original_name', 255);
                $table->string('disk', 30)->default('public');
                $table->string('path', 500);
                $table->string('url', 600);
                $table->string('mime_type', 100);
                $table->unsignedBigInteger('size')->default(0);
                $table->unsignedInteger('width')->nullable();
                $table->unsignedInteger('height')->nullable();
                $table->string('alt_text', 255)->nullable();
                $table->string('caption', 500)->nullable();
                $table->string('folder', 60)->default('general')->index();
                $table->unsignedBigInteger('uploaded_by')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('cms_newsletter_subscribers')) {
            Schema::create('cms_newsletter_subscribers', function (Blueprint $table) {
                $table->id();
                $table->string('email', 190)->unique();
                $table->string('locale', 10)->default('id');
                $table->string('source', 60)->default('homepage');
                $table->timestamps();
            });
        }

        if (Schema::hasTable('cms_sections')) {
            Schema::table('cms_sections', function (Blueprint $table) {
                if (!Schema::hasColumn('cms_sections', 'uid')) {
                    $table->string('uid', 80)->nullable()->after('id')->index();
                }
                if (!Schema::hasColumn('cms_sections', 'draft_payload')) {
                    $table->longText('draft_payload')->nullable()->after('draft_content');
                }
                if (!Schema::hasColumn('cms_sections', 'children')) {
                    $table->longText('children')->nullable()->after('settings');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('cms_sections')) {
            Schema::table('cms_sections', function (Blueprint $table) {
                $cols = array_filter(['uid', 'draft_payload', 'children'], fn ($c) => Schema::hasColumn('cms_sections', $c));
                if (!empty($cols)) {
                    $table->dropColumn($cols);
                }
            });
        }

        Schema::dropIfExists('cms_newsletter_subscribers');
        Schema::dropIfExists('cms_media');
        Schema::dropIfExists('cms_templates');
        Schema::dropIfExists('cms_revisions');
        Schema::dropIfExists('cms_pages');
    }
};

