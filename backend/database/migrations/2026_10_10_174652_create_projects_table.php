<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Projects — tenant-owned (PRD §6.3, CLAUDE.md §7). `company_id` is set by the BelongsToCompany
 * trait, never from input. A project belongs to one of the company's clients; a client with
 * projects can't be deleted (ClientService guard), and the foreign key restricts a hard delete
 * too. Soft deletes: deleting a project soft-deletes its children in ProjectService (a soft
 * delete never fires the foreign keys' cascade).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('client_id')->constrained('clients')->restrictOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->date('start_date');
            $table->date('end_date');
            $table->decimal('budget', 15, 2)->default(0);
            $table->enum('priority', ['low', 'medium', 'high', 'urgent'])->default('medium');
            $table->enum('status', ['active', 'completed', 'on_hold', 'inactive'])->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'status']);
            $table->index(['company_id', 'client_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
