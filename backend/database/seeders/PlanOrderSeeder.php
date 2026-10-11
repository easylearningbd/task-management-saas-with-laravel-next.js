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
 * A plan-order history across the seeded companies, with dates relative to today — enough for the
 * admin Plan Requests page to paginate (15 orders, 7 companies):
 *  - approved purchases behind the companies' current plans, a few rejected ones (with the reason
 *    the company reads) and one rejected manual request;
 *  - PENDING orders for Healthcare (Pro yearly, PNG receipt), Financial Services (Pro yearly, PDF
 *    receipt — the review modal's PDF case), Tech Solutions (Pro yearly) and Creative Agency (a
 *    manual Free request, no receipt). The demo company keeps no pending order, so every Plans-page
 *    action stays available there.
 * Seeded purchases get a tiny placeholder receipt on the private disk
 * (billing/receipts/{company_id}/…), so the receipt link has a file to open.
 * History only: no company's plan is changed. Idempotent and additive — an order is matched on
 * (company, plan, type, duration, status), deleted rows included; nothing is deleted. A pending
 * order is skipped when its company already has one (one pending order per company).
 * Needs PlanSeeder, AdminUserSeeder and CompanySeeder first.
 * Run: php artisan db:seed --class=PlanOrderSeeder
 */
class PlanOrderSeeder extends Seeder
{
    /** A 1×1 PNG — stands in for a bank receipt. */
    private const RECEIPT_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    /** A minimal one-page PDF — stands in for a bank transfer confirmation. */
    private const RECEIPT_PDF = "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 100]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n";

    /**
     * company, plan, type, duration, status, days ago, payment reference, receipt (png / pdf /
     * null), rejection reason, notes.
     *
     * @var list<array{0: string, 1: string, 2: PlanOrderType, 3: PlanDuration, 4: PlanOrderStatus, 5: int, 6: ?string, 7: ?string, 8: ?string, 9: ?string}>
     */
    private const ORDERS = [
        ['company@example.com', 'Pro', PlanOrderType::Purchase, PlanDuration::Monthly, PlanOrderStatus::Approved, 7, 'TRX-48213', 'png', null, null],
        ['company@example.com', 'Starter', PlanOrderType::Purchase, PlanDuration::Yearly, PlanOrderStatus::Rejected, 20, 'TRX-31877', 'png', 'The transfer did not arrive. Check the reference and submit again.', null],
        ['company@example.com', 'Starter', PlanOrderType::Request, PlanDuration::Monthly, PlanOrderStatus::Rejected, 45, null, null, 'Please subscribe through the checkout — requests without a payment are not approved.', 'Could we try Starter for a month?'],
        ['admin@healthcare.com', 'Pro', PlanOrderType::Purchase, PlanDuration::Yearly, PlanOrderStatus::Pending, 2, 'HC-2026-0117', 'png', null, null],
        ['admin@healthcare.com', 'Pro', PlanOrderType::Purchase, PlanDuration::Monthly, PlanOrderStatus::Approved, 25, 'HC-2026-0090', 'png', null, null],
        ['admin@financial.com', 'Pro', PlanOrderType::Purchase, PlanDuration::Yearly, PlanOrderStatus::Pending, 1, 'FS-2026-0107', 'pdf', null, 'Paid from our operating account — confirmation attached.'],
        ['admin@financial.com', 'Starter', PlanOrderType::Purchase, PlanDuration::Monthly, PlanOrderStatus::Approved, 40, 'FS-2026-0042', 'png', null, null],
        ['admin@manufacturing.com', 'Pro', PlanOrderType::Purchase, PlanDuration::Monthly, PlanOrderStatus::Approved, 35, 'MC-88120', 'png', null, null],
        ['admin@manufacturing.com', 'Starter', PlanOrderType::Purchase, PlanDuration::Monthly, PlanOrderStatus::Rejected, 50, 'MC-77001', 'png', 'The receipt shows a different amount. Upload the matching bank slip.', null],
        ['admin@creativeagency.com', 'Free', PlanOrderType::Request, PlanDuration::Monthly, PlanOrderStatus::Pending, 3, null, null, null, 'We are pausing new projects for a while.'],
        ['admin@creativeagency.com', 'Starter', PlanOrderType::Purchase, PlanDuration::Monthly, PlanOrderStatus::Approved, 30, 'CA-5510', 'png', null, null],
        ['admin@techsolutions.com', 'Pro', PlanOrderType::Purchase, PlanDuration::Yearly, PlanOrderStatus::Pending, 4, 'TS-33190', 'png', null, null],
        ['admin@techsolutions.com', 'Pro', PlanOrderType::Purchase, PlanDuration::Monthly, PlanOrderStatus::Approved, 28, 'TS-33017', 'png', null, null],
        ['admin@globalenterprises.com', 'Pro', PlanOrderType::Purchase, PlanDuration::Yearly, PlanOrderStatus::Rejected, 12, 'GE-10871', 'png', 'No transfer with this reference reached our account.', null],
        ['admin@globalenterprises.com', 'Starter', PlanOrderType::Purchase, PlanDuration::Monthly, PlanOrderStatus::Approved, 45, 'GE-10233', 'png', null, null],
    ];

    public function run(): void
    {
        $admin = User::query()->where('email', 'superadmin@example.com')->first();
        $created = 0;
        $skipped = 0;

        foreach (self::ORDERS as [$email, $planName, $type, $duration, $status, $daysAgo, $reference, $receipt, $reason, $notes]) {
            $company = User::query()->where('email', $email)->first();
            $plan = Plan::query()->where('name', $planName)->first();
            if (! $company || ! $plan) {
                $this->command?->warn("Skipped {$email} / {$planName}: company or plan missing.");
                $skipped++;

                continue;
            }

            $made = Tenancy::instance()->runAs($company, function () use ($company, $plan, $type, $duration, $status, $daysAgo, $reference, $receipt, $reason, $notes, $admin): bool {
                $exists = PlanOrder::withTrashed()
                    ->where('plan_id', $plan->id)
                    ->where('type', $type->value)
                    ->where('duration', $duration->value)
                    ->where('status', $status->value)
                    ->exists();
                // One pending order per company: never add a second one.
                if ($exists || ($status === PlanOrderStatus::Pending && PlanOrder::query()->pending()->exists())) {
                    return false;
                }

                return DB::transaction(function () use ($company, $plan, $type, $duration, $status, $daysAgo, $reference, $receipt, $reason, $notes, $admin): bool {
                    $at = Carbon::now()->subDays($daysAgo)->setTime(10, 30);
                    $code = OrderCode::next($at);
                    $isRequest = $type === PlanOrderType::Request;
                    $price = $isRequest ? '0.00' : ($duration === PlanDuration::Yearly ? $plan->yearly_price : $plan->monthly_price);

                    $path = null;
                    $name = null;
                    if ($receipt !== null) {
                        $path = "billing/receipts/{$company->getKey()}/seed-{$code}.{$receipt}";
                        $name = $receipt === 'pdf' ? 'bank-transfer.pdf' : 'bank-receipt.png';
                        Storage::disk('local')->put($path, $receipt === 'pdf' ? self::RECEIPT_PDF : base64_decode(self::RECEIPT_PNG));
                    }

                    $reviewed = $status !== PlanOrderStatus::Pending;
                    $order = new PlanOrder;
                    $order->forceFill([
                        'order_code' => $code,
                        'plan_id' => $plan->id,
                        'type' => $type,
                        'duration' => $duration,
                        'price' => $price,
                        'discount' => '0.00',
                        'final_amount' => $price,
                        'payment_method' => $isRequest ? PaymentMethod::Manual : PaymentMethod::BankTransfer,
                        'payment_reference' => $reference,
                        'receipt_path' => $path,
                        'receipt_name' => $name,
                        'notes' => $notes,
                        'status' => $status,
                        'reviewed_by' => $reviewed ? $admin?->getKey() : null,
                        'reviewed_at' => $reviewed ? $at->copy()->addDay() : null,
                        'rejection_reason' => $reason,
                        'created_at' => $at,
                        'updated_at' => $reviewed ? $at->copy()->addDay() : $at,
                    ])->save();

                    return true;
                });
            });

            $made ? $created++ : $skipped++;
        }

        $this->command?->info("Plan orders: {$created} created, {$skipped} already present or skipped.");
    }
}
