<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. User Profile Enhancements
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'avatar_url')) {
                $table->text('avatar_url')->nullable()->after('phone');
            }
            if (!Schema::hasColumn('users', 'bio')) {
                $table->text('bio')->nullable()->after('avatar_url');
            }
            if (!Schema::hasColumn('users', 'job_title')) {
                $table->string('job_title', 150)->nullable()->after('bio');
            }
            if (!Schema::hasColumn('users', 'organization')) {
                $table->string('organization', 150)->nullable()->after('job_title');
            }
            if (!Schema::hasColumn('users', 'department')) {
                $table->string('department', 150)->nullable()->after('organization');
            }
            if (!Schema::hasColumn('users', 'country')) {
                $table->string('country', 100)->nullable()->after('department');
            }
            if (!Schema::hasColumn('users', 'timezone')) {
                $table->string('timezone', 50)->default('Asia/Jakarta')->after('country');
            }
            if (!Schema::hasColumn('users', 'preferred_language')) {
                $table->string('preferred_language', 10)->default('id')->after('timezone');
            }
            if (!Schema::hasColumn('users', 'reading_goals')) {
                $table->json('reading_goals')->nullable()->after('preferred_language');
            }
        });

        // 2. Entitlement Kanban Pipeline Enhancements
        Schema::table('entitlements', function (Blueprint $table) {
            if (!Schema::hasColumn('entitlements', 'pipeline_status')) {
                $table->string('pipeline_status', 30)->default('to_read')->after('progress')->index();
            }
            if (!Schema::hasColumn('entitlements', 'pipeline_priority')) {
                $table->string('pipeline_priority', 20)->default('medium')->after('pipeline_status');
            }
            if (!Schema::hasColumn('entitlements', 'pipeline_deadline')) {
                $table->date('pipeline_deadline')->nullable()->after('pipeline_priority');
            }
            if (!Schema::hasColumn('entitlements', 'pipeline_notes')) {
                $table->text('pipeline_notes')->nullable()->after('pipeline_deadline');
            }
            if (!Schema::hasColumn('entitlements', 'pipeline_order')) {
                $table->integer('pipeline_order')->default(0)->after('pipeline_notes');
            }
        });

        // 3. Reading Planner & Schedules
        if (!Schema::hasTable('reading_schedules')) {
            Schema::create('reading_schedules', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
                $table->string('title', 255);
                $table->date('scheduled_date')->index();
                $table->string('start_time', 10)->nullable();
                $table->string('end_time', 10)->nullable();
                $table->integer('target_duration_minutes')->default(60);
                $table->string('target_pages', 50)->nullable();
                $table->string('priority', 20)->default('medium'); // low, medium, high, urgent
                $table->string('status', 20)->default('scheduled')->index(); // scheduled, in_progress, completed, missed, cancelled
                $table->text('notes')->nullable();
                $table->timestamp('completed_at')->nullable();
                $table->timestamps();
            });
        }

        // 4. Reading Activity Log & Session History
        if (!Schema::hasTable('reading_activities')) {
            Schema::create('reading_activities', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('product_id')->nullable()->constrained()->nullOnDelete();
                $table->string('activity_type', 50)->index(); // reading_started, reading_continued, reading_completed, highlight_created, note_created, bookmark_created, schedule_created, schedule_completed
                $table->string('description', 500);
                $table->json('metadata')->nullable();
                $table->integer('duration_minutes')->default(0);
                $table->integer('pages_read')->default(0);
                $table->timestamp('occurred_at')->index();
                $table->timestamps();
            });
        }

        // 5. Research Collections (Topic Folders)
        if (!Schema::hasTable('research_collections')) {
            Schema::create('research_collections', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('name', 150);
                $table->string('color', 20)->default('#1976D2');
                $table->text('description')->nullable();
                $table->json('item_ids')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('research_collections');
        Schema::dropIfExists('reading_activities');
        Schema::dropIfExists('reading_schedules');

        Schema::table('entitlements', function (Blueprint $table) {
            $cols = ['pipeline_status', 'pipeline_priority', 'pipeline_deadline', 'pipeline_notes', 'pipeline_order'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('entitlements', $col)) {
                    $table->dropColumn($col);
                }
            }
        });

        Schema::table('users', function (Blueprint $table) {
            $cols = ['avatar_url', 'bio', 'job_title', 'organization', 'department', 'country', 'timezone', 'preferred_language', 'reading_goals'];
            foreach ($cols as $col) {
                if (Schema::hasColumn('users', $col)) {
                    $table->dropColumn($col);
                }
            }
        });
    }
};

