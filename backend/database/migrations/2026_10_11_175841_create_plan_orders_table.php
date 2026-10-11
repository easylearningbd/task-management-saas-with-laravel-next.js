<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Everything a company asks of its subscription, in one table (Billing Phase 0 — the single
 * `plan_orders` model, replacing PRD §10's separate `plan_requests`): `type` request (Request
 * Plan, no payment), purchase (Subscribe Now → checkout → payment; also the auto-approved $0
 * subscription) or trial (Start N Day Trial, auto-approved).
 *  - `price` is the plan price AT SUBMISSION — a snapshot, never re-read from the plan.
 *  - `coupon_id` / `discount` are reserved for coupons at checkout (not applied yet);
 *    `final_amount` = price − discount.
 *  - `receipt_path` points at the private disk (billing/receipts/{company_id}/…), never the media
 *    library: receipts are billing documents, not the company's files.
 *  - Only an admin approval (or an auto-approved trial / $0 order) changes the company's plan.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plan_orders', function (Blueprint $table) {
            $table->id();
            $table->string('order_code', 32)->unique(); // ORD-{YYYY}-{NNNN}
            $table->foreignId('company_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('plan_id')->constrained('plans')->restrictOnDelete();
            $table->enum('type', ['request', 'purchase', 'trial'])->index();
            $table->enum('duration', ['monthly', 'yearly']);
            $table->decimal('price', 15, 2);
            $table->foreignId('coupon_id')->nullable()->constrained('coupons')->nullOnDelete(); // reserved
            $table->decimal('discount', 15, 2)->default(0); // reserved
            $table->decimal('final_amount', 15, 2);
            $table->enum('payment_method', ['bank_transfer', 'stripe', 'manual', 'free'])->nullable();
            $table->string('payment_reference', 100)->nullable();
            $table->string('receipt_path')->nullable();
            $table->string('receipt_name')->nullable(); // the uploaded file's display name
            $table->text('notes')->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending')->index();
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('reviewed_at')->nullable();
            $table->text('rejection_reason')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'status']);
            $table->index(['company_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plan_orders');
    }
};
