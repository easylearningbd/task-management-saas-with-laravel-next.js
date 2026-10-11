<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Media attached to a task (the task Files tab) — mirrors `project_files` exactly: a link only,
 * unique per (task, media), so detaching removes this row and leaves the media in the library.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('task_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('task_id')->constrained('tasks')->cascadeOnDelete();
            $table->foreignId('media_id')->constrained('media')->cascadeOnDelete();
            $table->foreignId('attached_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->unique(['task_id', 'media_id']);
            $table->index(['company_id', 'task_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('task_files');
    }
};
