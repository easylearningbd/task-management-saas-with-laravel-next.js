<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The taxes applied to an invoice (PRD §10). `name` and `rate` are SNAPSHOTS taken at save time —
 * editing or deleting the tax later (`tax_id` → null) never rewrites a historical invoice.
 * `amount` = (subtotal − discount) × rate / 100. Reached only through its invoice (no company_id).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_taxes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->foreignId('tax_id')->nullable()->constrained('taxes')->nullOnDelete();
            $table->string('name', 100);
            $table->decimal('rate', 5, 2);
            $table->decimal('amount', 15, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_taxes');
    }
};
