<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * An invoice's lines (PRD §10). `type` item → one of the invoice project's `project_items`;
 * task → one of its `tasks`. The source is only a link: description, quantity and price are the
 * invoice's own (prefilled, editable), so deleting the item or task later keeps the line
 * (`nullOnDelete`). `total` = quantity × price, computed by InvoiceService. `position` keeps the
 * form's order.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->enum('type', ['item', 'task']);
            $table->foreignId('project_item_id')->nullable()->constrained('project_items')->nullOnDelete();
            $table->foreignId('task_id')->nullable()->constrained('tasks')->nullOnDelete();
            $table->text('description');
            $table->decimal('quantity', 10, 2);
            $table->decimal('price', 15, 2);
            $table->decimal('total', 15, 2);
            $table->unsignedInteger('position');
            $table->timestamps();

            $table->index(['invoice_id', 'position']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_items');
    }
};
