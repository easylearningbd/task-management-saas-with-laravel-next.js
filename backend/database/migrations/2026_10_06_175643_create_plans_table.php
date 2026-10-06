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
        Schema::create('plans', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->text('description')->nullable();
            $table->decimal('monthly_price', 15, 2)->default(0);
            $table->decimal('yearly_price', 15, 2)->default(0);
            $table->integer('max_projects')->default(0); // -1 = unlimited
            $table->decimal('storage_limit_gb', 8, 2)->default(0);
            $table->boolean('trial_enabled')->default(false);
            $table->unsignedInteger('trial_days')->default(0);
            $table->boolean('ai_integration')->default(false);
            $table->boolean('is_active')->default(true)->index();
            $table->boolean('is_default')->default(false)->index(); // at most one row true (PlanService)
            $table->boolean('is_recommended')->default(false);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('plans');
    }
};
