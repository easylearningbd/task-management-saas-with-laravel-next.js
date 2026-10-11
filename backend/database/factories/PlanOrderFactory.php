<?php

namespace Database\Factories;

use App\Enums\PaymentMethod;
use App\Enums\PlanDuration;
use App\Enums\PlanOrderStatus;
use App\Enums\PlanOrderType;
use App\Models\Plan;
use App\Models\PlanOrder;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

/**
 * A plan order row for tests — a pending bank-transfer purchase by default (no receipt file;
 * tests that need one upload through BillingService with Storage::fake()). Create it in the
 * company's context, and give it a plan:
 *
 *     Tenancy::instance()->runAs($company, fn () => PlanOrder::factory()->for($plan)->create());
 *
 * The code has its own prefix (ORD-TEST-…), outside every year's ORD-{YYYY}- sequence, so a test
 * mixing factory rows with real submissions still sees the app number from 0001.
 *
 * @extends Factory<PlanOrder>
 */
class PlanOrderFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'order_code' => 'ORD-TEST-'.fake()->unique()->numerify('######'),
            'plan_id' => Plan::factory(),
            'type' => PlanOrderType::Purchase,
            'duration' => PlanDuration::Monthly,
            'price' => '19.99',
            'discount' => '0.00',
            'final_amount' => '19.99',
            'payment_method' => PaymentMethod::BankTransfer,
            'payment_reference' => fake()->bothify('TRX-#####'),
            'receipt_path' => null,
            'receipt_name' => null,
            'notes' => null,
            'status' => PlanOrderStatus::Pending,
        ];
    }

    public function approved(): static
    {
        return $this->state(fn () => ['status' => PlanOrderStatus::Approved, 'reviewed_at' => Carbon::now()]);
    }

    public function rejected(string $reason = 'Payment not received.'): static
    {
        return $this->state(fn () => ['status' => PlanOrderStatus::Rejected, 'reviewed_at' => Carbon::now(), 'rejection_reason' => $reason]);
    }

    /** Request Plan: no payment, amount 0. */
    public function request(): static
    {
        return $this->state(fn () => [
            'type' => PlanOrderType::Request,
            'price' => '0.00',
            'final_amount' => '0.00',
            'payment_method' => PaymentMethod::Manual,
            'payment_reference' => null,
        ]);
    }

    /** A trial: applied at once, nothing to pay. */
    public function trial(): static
    {
        return $this->state(fn () => [
            'type' => PlanOrderType::Trial,
            'price' => '0.00',
            'final_amount' => '0.00',
            'payment_method' => PaymentMethod::Free,
            'payment_reference' => null,
            'status' => PlanOrderStatus::Approved,
            'reviewed_at' => Carbon::now(),
        ]);
    }

    public function yearly(): static
    {
        return $this->state(fn () => ['duration' => PlanDuration::Yearly]);
    }
}
