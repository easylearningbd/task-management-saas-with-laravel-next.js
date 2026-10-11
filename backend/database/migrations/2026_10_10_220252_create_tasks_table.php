<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tasks (PRD §6.4) — the Kanban cards. Tenant-owned (BelongsToCompany stamps `company_id`).
 * `position` orders a task within its stage column (contiguous from 1, kept by TaskService).
 * `milestone_id` must belong to the same project (TaskService) and is cleared if the milestone
 * goes; a stage with tasks can't be deleted (restrict + TaskStageService). Soft deletes: a
 * project's tasks are soft-deleted with it by ProjectService (a soft delete fires no cascade).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('tasks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->foreignId('milestone_id')->nullable()->constrained('milestones')->nullOnDelete();
            $table->foreignId('task_stage_id')->constrained('task_stages')->restrictOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->date('start_date');
            $table->date('due_date');
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium')->index();
            $table->unsignedTinyInteger('progress')->default(0);
            $table->unsignedInteger('position');
            $table->timestamp('completed_at')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'task_stage_id', 'position']);
            $table->index(['company_id', 'project_id']);
            $table->index(['company_id', 'due_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tasks');
    }
};
