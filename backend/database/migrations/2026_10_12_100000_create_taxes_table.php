<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A company's tax rates (PRD §10) — offered on the invoice form's Tax multi-select. `rate` is a
 * percent ("10.00" = 10%). Seeded per company by CompanySetupService; managed by the Settings /
 * Items pages later. An invoice snapshots each tax's name and rate (`invoice_taxes`), so changing
 * or deleting a tax never rewrites an invoice.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('taxes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->constrained('users')->cascadeOnDelete();
            $table->string('name', 100);
            $table->decimal('rate', 5, 2);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['company_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('taxes');
    }
};
