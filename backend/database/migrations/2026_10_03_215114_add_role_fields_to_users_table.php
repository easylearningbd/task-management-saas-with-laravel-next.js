<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('type', ['super_admin', 'company'])->default('company')->after('password')->index();
            $table->string('avatar')->nullable()->after('type');
            $table->boolean('is_login_enabled')->default(true)->after('avatar');
            $table->enum('status', ['active', 'inactive'])->default('active')->after('is_login_enabled');
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropIndex(['type']);
            $table->dropSoftDeletes();
            $table->dropColumn(['type', 'avatar', 'is_login_enabled', 'status']);
        });
    }
};
