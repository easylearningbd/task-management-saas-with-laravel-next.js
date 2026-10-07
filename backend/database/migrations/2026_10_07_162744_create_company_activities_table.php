<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * The company audit log: every admin action on a company (create, update, plan change,
     * login toggle, password reset, impersonation, delete). Companies are `users` rows.
     */
    public function up(): void
    {
        Schema::create('company_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete(); // null = system / seeder
            $table->string('action', 50)->index(); // App\Enums\CompanyActivityAction
            $table->string('description')->nullable();
            $table->json('meta')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('company_activities');
    }
};
