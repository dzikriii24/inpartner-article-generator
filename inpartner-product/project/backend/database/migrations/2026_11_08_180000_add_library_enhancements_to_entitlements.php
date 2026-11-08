<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('entitlements', function (Blueprint $table) {
            if (!Schema::hasColumn('entitlements', 'is_starred')) {
                $table->boolean('is_starred')->default(false)->after('progress');
            }
            if (!Schema::hasColumn('entitlements', 'starred_at')) {
                $table->timestamp('starred_at')->nullable()->after('is_starred');
            }
            if (!Schema::hasColumn('entitlements', 'hidden_from_history')) {
                $table->boolean('hidden_from_history')->default(false)->after('starred_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('entitlements', function (Blueprint $table) {
            if (Schema::hasColumn('entitlements', 'hidden_from_history')) {
                $table->dropColumn('hidden_from_history');
            }
            if (Schema::hasColumn('entitlements', 'starred_at')) {
                $table->dropColumn('starred_at');
            }
            if (Schema::hasColumn('entitlements', 'is_starred')) {
                $table->dropColumn('is_starred');
            }
        });
    }
};

