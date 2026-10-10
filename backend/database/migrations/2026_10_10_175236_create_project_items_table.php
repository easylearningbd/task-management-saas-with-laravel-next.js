<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Project items — products and services owned by one project (the Items tab screenshot:
 * Name, Description, Default Price, Unit; no catalog, no quantity). The name `items` stays free
 * for a future company-wide catalog (PRD §6.11 is updated to match in the final phase).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('project_id')->constrained('projects')->cascadeOnDelete();
            $table->string('name');
            $table->text('description')->nullable();
            $table->decimal('default_price', 15, 2)->default(0);
            $table->enum('unit', ['hours', 'package', 'piece', 'day', 'month', 'fixed']);
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'project_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_items');
    }
};
