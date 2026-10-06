<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations. Additive and all nullable — existing users keep every value.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('plan_id')->nullable()->after('status')->constrained('plans')->nullOnDelete();
            $table->enum('plan_duration', ['monthly', 'yearly'])->nullable()->after('plan_id');
            $table->timestamp('plan_expires_at')->nullable()->after('plan_duration');
            $table->timestamp('trial_ends_at')->nullable()->after('plan_expires_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('plan_id');
            $table->dropColumn(['plan_duration', 'plan_expires_at', 'trial_ends_at']);
        });
    }
};
