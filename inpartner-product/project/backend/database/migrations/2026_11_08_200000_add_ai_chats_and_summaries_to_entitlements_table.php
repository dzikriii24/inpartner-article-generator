<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('entitlements', function (Blueprint $table) {
            if (!Schema::hasColumn('entitlements', 'ai_chats')) {
                $table->json('ai_chats')->nullable()->after('highlights');
            }
            if (!Schema::hasColumn('entitlements', 'page_summaries')) {
                $table->json('page_summaries')->nullable()->after('ai_chats');
            }
        });
    }

    public function down(): void
    {
        Schema::table('entitlements', function (Blueprint $table) {
            if (Schema::hasColumn('entitlements', 'page_summaries')) {
                $table->dropColumn('page_summaries');
            }
            if (Schema::hasColumn('entitlements', 'ai_chats')) {
                $table->dropColumn('ai_chats');
            }
        });
    }
};

