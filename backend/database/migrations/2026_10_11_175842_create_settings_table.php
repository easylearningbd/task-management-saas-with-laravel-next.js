<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Key/value settings (PRD §10): `company_id` null = a global (platform) setting, e.g. the
 * bank-transfer details shown at checkout; a company id = that company's own setting.
 * unique(company_id, key) holds per company; MySQL treats NULLs as distinct in a unique index,
 * so global keys are kept unique by the code that writes them (Setting::putGlobal /
 * updateOrCreate on a NULL company_id).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('company_id')->nullable()->constrained('users')->cascadeOnDelete();
            $table->string('key', 100);
            $table->text('value')->nullable();
            $table->timestamps();

            $table->unique(['company_id', 'key']);
            $table->index('key');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
