<?php

namespace Database\Seeders;

use App\Enums\PaymentMethod;
use App\Enums\PlanDuration;
use App\Enums\PlanOrderStatus;
use App\Enums\PlanOrderType;
use App\Models\Plan;
use App\Models\PlanOrder;
use App\Models\User;
use App\Support\Billing\OrderCode;
use App\Support\Tenancy\Tenancy;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * A small plan-order history (Billing Phase 1), with dates relative to today:
 *  - company@example.com: one APPROVED Pro monthly bank-transfer purchase (the order behind its
 *    current Pro plan) and one REJECTED Starter yearly purchase, with its reason;
 *  - admin@healthcare.com: one PENDING Pro yearly bank-transfer purchase — the demo company
 *    keeps no pending order, so every Plans-page action stays available there.
 * Seeded purchases get a tiny placeholder receipt on the private disk
 * (billing/receipts/{company_id}/…), so the receipt link has a file to open.
 * History only: no company's plan is changed. Idempotent and additive — an order is matched on
 * (company, plan, type, duration, status), deleted rows included; nothing is deleted.
 * Needs PlanSeeder, AdminUserSeeder and CompanySeeder first.
 * Run: php artisan db:seed --class=PlanOrderSeeder
 */
class PlanOrderSeeder extends Seeder
{
    /** A 1×1 PNG — stands in for a bank receipt. */
    private const RECEIPT_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    /** [company email, plan name, duration, status, created (days ago), reference, rejection reason] */
    private const ORDERS = [
        ['company@example.com', 'Pro', PlanDuration::Monthly, PlanOrderStatus::Approved, 7, 'TRX-48213', null],
        ['company@example.com', 'Starter', PlanDuration::Yearly, PlanOrderStatus::Rejected, 20, 'TRX-31877', 'The transfer did not arrive. Check the reference and submit again.'],
        ['admin@healthcare.com', 'Pro', PlanDuration::Yearly, PlanOrderStatus::Pending, 2, 'HC-2026-0117', null],
    ];

    public function run(): void
    {
        $admin = User::query()->where('email', 'superadmin@example.com')->first();
        $created = 0;
        $skipped = 0;

        foreach (self::ORDERS as [$email, $planName, $duration, $status, $daysAgo, $reference, $reason]) {
            $company = User::query()->where('email', $email)->first();
            $plan = Plan::query()->where('name', $planName)->first();
            if (! $company || ! $plan) {
                $this->command?->warn("Skipped {$email} / {$planName}: company or plan missing.");
                $skipped++;

                continue;
            }

            $made = Tenancy::instance()->runAs($company, function () use ($company, $plan, $duration, $status, $daysAgo, $reference, $reason, $admin): bool {
                $exists = PlanOrder::withTrashed()
                    ->where('plan_id', $plan->id)
                    ->where('type', PlanOrderType::Purchase->value)
                    ->where('duration', $duration->value)
                    ->where('status', $status->value)
                    ->exists();
                if ($exists) {
                    return false;
                }

                return DB::transaction(function () use ($company, $plan, $duration, $status, $daysAgo, $reference, $reason, $admin): bool {
                    $at = Carbon::now()->subDays($daysAgo)->setTime(10, 30);
                    $code = OrderCode::next($at);
                    $price = $duration === PlanDuration::Yearly ? $plan->yearly_price : $plan->monthly_price;

                    $path = "billing/receipts/{$company->getKey()}/seed-{$code}.png";
                    Storage::disk('local')->put($path, base64_decode(self::RECEIPT_PNG));

                    $order = new PlanOrder;
                    $order->forceFill([
                        'order_code' => $code,
                        'plan_id' => $plan->id,
                        'type' => PlanOrderType::Purchase,
                        'duration' => $duration,
                        'price' => $price,
                        'discount' => '0.00',
                        'final_amount' => $price,
                        'payment_method' => PaymentMethod::BankTransfer,
                        'payment_reference' => $reference,
                        'receipt_path' => $path,
                        'receipt_name' => 'bank-receipt.png',
                        'status' => $status,
                        'reviewed_by' => $status === PlanOrderStatus::Pending ? null : $admin?->getKey(),
                        'reviewed_at' => $status === PlanOrderStatus::Pending ? null : $at->copy()->addDay(),
                        'rejection_reason' => $reason,
                        'created_at' => $at,
                        'updated_at' => $status === PlanOrderStatus::Pending ? $at : $at->copy()->addDay(),
                    ])->save();

                    return true;
                });
            });

            $made ? $created++ : $skipped++;
        }

        $this->command?->info("Plan orders: {$created} created, {$skipped} already present or skipped.");
    }
}
