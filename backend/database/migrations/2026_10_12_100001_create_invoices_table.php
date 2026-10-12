<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A company's invoices (PRD §6.8, §10). Every amount is computed by InvoiceService from the lines
 * — never taken from the client:
 *   subtotal = Σ line totals · discount_amount (flat, ≤ subtotal) · tax_amount = Σ (subtotal −
 *   discount) × rate / 100 · total = subtotal − discount + tax · paid_amount = Σ payments ·
 *   balance_due = total − paid (never below 0).
 * `invoice_number` INV-{YYYY}-{NNNN}, per company (two companies can hold the same number).
 * `public_token` — the unguessable key of the public share page (/i/{token}). `sent_at` is
 * reserved for Send Invoice. Client and project are restricted: an invoiced client / project
 * can't be hard-deleted.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('client_id')->constrained('clients')->restrictOnDelete();
            $table->foreignId('project_id')->constrained('projects')->restrictOnDelete();
            $table->string('invoice_number', 32);
            $table->date('invoice_date');
            $table->date('due_date');
            $table->decimal('subtotal', 15, 2)->default(0);
            $table->decimal('discount_amount', 15, 2)->default(0);
            $table->decimal('tax_amount', 15, 2)->default(0);
            $table->decimal('total', 15, 2)->default(0);
            $table->decimal('paid_amount', 15, 2)->default(0);
            $table->decimal('balance_due', 15, 2)->default(0);
            $table->enum('status', ['draft', 'sent', 'partial', 'paid'])->default('draft')->index();
            $table->text('notes')->nullable();
            $table->string('public_token', 64)->unique();
            $table->timestamp('sent_at')->nullable(); // reserved for Send Invoice
            $table->timestamps();
            $table->softDeletes();

            $table->unique(['company_id', 'invoice_number']);
            $table->index(['company_id', 'status']);
            $table->index(['company_id', 'due_date']);
            $table->index(['company_id', 'invoice_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoices');
    }
};
