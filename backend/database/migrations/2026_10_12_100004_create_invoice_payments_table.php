<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Payments received against an invoice (PRD §6.8, §10). PaymentService never accepts more than
 * the balance due, and recalculates the invoice (paid, balance, status) after every add and
 * delete. `reference` PAY{000000} — one platform-wide sequence, unique. `receipt_path` is reserved
 * (no receipt upload yet). A deleted payment is removed outright (the invoice rolls back).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invoice_payments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('invoice_id')->constrained('invoices')->cascadeOnDelete();
            $table->date('payment_date');
            $table->decimal('amount', 15, 2);
            $table->enum('payment_type', ['credit_card', 'bank_transfer', 'cash', 'cheque', 'other']);
            $table->string('reference', 20)->unique();
            $table->string('status', 20)->default('paid');
            $table->string('receipt_path')->nullable(); // reserved — no receipt upload yet
            $table->text('description')->nullable();
            $table->timestamps();

            $table->index(['company_id', 'invoice_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invoice_payments');
    }
};
