<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('coupons', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code', 50)->unique(); // stored uppercase; soft-deleted codes stay reserved
            $table->enum('type', ['percentage', 'flat']);
            $table->decimal('value', 15, 2); // a percent or a currency amount, per `type`
            $table->decimal('min_spend', 15, 2)->nullable();
            $table->decimal('max_spend', 15, 2)->nullable();
            $table->unsignedInteger('usage_limit')->nullable(); // null = unlimited
            $table->unsignedInteger('per_user_limit')->nullable(); // null = unlimited
            $table->date('expiry_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            // Status and type filters; is_active leads, so it also serves status-only queries.
            $table->index(['is_active', 'type']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('coupons');
    }
};
