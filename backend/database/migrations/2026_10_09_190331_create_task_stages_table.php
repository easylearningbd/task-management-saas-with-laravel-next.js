<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Task stages — tenant-owned (PRD §6.13, CLAUDE.md §7/§13). `company_id` is set by the
 * BelongsToCompany trait, never from input. A name is unique per company, not globally: two
 * companies may each have "To Do". `order` is kept contiguous 1..n per company by
 * TaskStageService (so it is indexed, not unique — renumbering moves several rows at once).
 * `color` is `#RRGGBB`, stored uppercase by the model. Exactly one stage per company is the
 * done stage; the service guarantees it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_stages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('users')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->string('color', 7);
            $table->unsignedInteger('order')->index();
            $table->boolean('is_done_stage')->default(false)->index();
            $table->enum('status', ['active', 'inactive'])->default('active')->index();
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'name']);
            $table->index(['company_id', 'order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_stages');
    }
};
