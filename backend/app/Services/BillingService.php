<?php

namespace App\Services;

use App\Enums\PaymentMethod;
use App\Enums\PlanDuration;
use App\Enums\PlanOrderStatus;
use App\Enums\PlanOrderType;
use App\Models\Company;
use App\Models\Plan;
use App\Models\PlanOrder;
use App\Support\Billing\OrderCode;
use App\Support\Tenancy\Tenancy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Response;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

/**
 * The company side of billing (Billing PAGE SPECs A–B): what the Plans page shows, and the four
 * things a company can do with a plan. Every rule is here, server-side:
 *
 *  1. The price is SNAPSHOTTED at submission (`price`, `final_amount`); a later plan edit never
 *     changes an order.
 *  2. One pending order at a time — any action while one is pending is refused (422
 *     `pending_order`).
 *  3. "Current" is plan AND duration: Pro Yearly is current only in the Yearly view; buying or
 *     requesting the same plan for the other duration is allowed.
 *  4. Submitting never changes the company's plan — only an approval does (PlanOrderService),
 *     except the two orders applied at once: a trial and a $0 subscription.
 *  5. Trials: only when the plan has one; one per plan per company, ever (any trial order for that
 *     plan, deleted ones included); not on the plan the company is on; applied at once with
 *     `trial_ends_at` (= `plan_expires_at`) = now + trial_days.
 *  6. A $0 plan is subscribed to at once (no checkout, never expires); a paid plan only through
 *     checkout; Request Plan works for any plan and costs nothing.
 *  7. Stripe is never accepted (422), whatever the request says; bank transfer is the only
 *     working method, and needs a receipt.
 *  8. Receipts are billing documents, not media: a private-disk file under
 *     billing/receipts/{company_id}/ — never in the media table, so never in the Media Library
 *     picker and never counted against the storage limit.
 * Trials and $0 switches are logged with the company itself as the actor (it did them).
 * Every action locks the company row first, so two submissions can't both pass the pending
 * check, and runs in the company's tenancy context (orders are BelongsToCompany).
 */
class BillingService
{
    /** Where receipts live (the private disk — see config/filesystems.php). */
    public const RECEIPT_DISK = 'local';

    /** Receipt content types → the extension stored on disk (from the detected type, never the name). */
    public const RECEIPT_TYPES = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'application/pdf' => 'pdf'];

    public const RECEIPT_MAX_KB = 5120; // 5 MB

    public function __construct(private readonly CompanyService $companies) {}

    /* ── Reading ───────────────────────────────────────────────────────────────────────── */

    /**
     * The Plans page: active plans in `sort_order`, what the company is on, which trials it can
     * still start, and its pending order (if any).
     *
     * @return array{plans: Collection<int, Plan>, current: array{plan_id: int|null, duration: PlanDuration|null, expires_at: Carbon|null, trial_ends_at: Carbon|null}, trials: array<int, array{used: bool, available: bool}>, pending: PlanOrder|null}
     */
    public function catalog(Company $company): array
    {
        return Tenancy::instance()->runAs($company, function () use ($company): array {
            $plans = Plan::query()->active()->ordered()->get();
            $usedTrials = $this->usedTrialPlanIds();
            $pending = PlanOrder::query()->pending()->with('plan')->latest('id')->first();

            $trials = [];
            foreach ($plans as $plan) {
                $used = in_array($plan->id, $usedTrials, true);
                $trials[$plan->id] = [
                    'used' => $used,
                    'available' => $this->hasTrial($plan) && ! $used && $company->plan_id !== $plan->id && $pending === null,
                ];
            }

            return [
                'plans' => $plans,
                'current' => [
                    'plan_id' => $company->plan_id,
                    'duration' => $company->plan_duration,
                    'expires_at' => $company->plan_expires_at,
                    'trial_ends_at' => $company->trial_ends_at,
                ],
                'trials' => $trials,
                'pending' => $pending,
            ];
        });
    }

    /**
     * The company's own orders (the Plan Requests list) — the tenant scope keeps them its own.
     *
     * @param  array{search?: ?string, status?: ?string, type?: ?string}  $filters
     * @return Builder<PlanOrder>
     */
    public function orders(array $filters): Builder
    {
        return PlanOrder::query()->with(['plan', 'company'])->filter($filters);
    }

    /**
     * Streams an order's receipt from the private disk, for the company that owns it or a super
     * admin (the routes decide who): inline for an image or a PDF (the browser shows it), or as an
     * attachment with `$download`. Never cached. No receipt, or the file is gone → 404.
     */
    public static function receiptResponse(PlanOrder $order, bool $download = false): StreamedResponse
    {
        $disk = Storage::disk(self::RECEIPT_DISK);
        abort_if($order->receipt_path === null || ! $disk->exists($order->receipt_path), Response::HTTP_NOT_FOUND);

        $extension = strtolower(pathinfo($order->receipt_path, PATHINFO_EXTENSION));
        $type = array_search($extension, self::RECEIPT_TYPES, true) ?: 'application/octet-stream';
        $name = $order->receipt_name ?: $order->order_code.'.'.$extension;

        return $disk->response($order->receipt_path, $name, [
            'Content-Type' => $type,
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ], $download ? 'attachment' : 'inline');
    }

    /* ── Actions ───────────────────────────────────────────────────────────────────────── */

    /**
     * Subscribe Now → checkout: a PENDING bank-transfer purchase with its receipt. The plan
     * doesn't change until an admin approves it.
     */
    public function submitPurchase(
        Company $company,
        Plan $plan,
        PlanDuration $duration,
        PaymentMethod $method,
        UploadedFile $receipt,
        ?string $reference,
        ?string $notes,
    ): PlanOrder {
        if ($method === PaymentMethod::Stripe) {
            $this->fail('payment_method', __('Card payments aren\'t available yet. Please pay by bank transfer.'));
        }
        if ($method !== PaymentMethod::BankTransfer) {
            $this->fail('payment_method', __('Choose bank transfer to pay for this plan.'));
        }
        $extension = $this->receiptExtension($receipt);

        return $this->inCompany($company, function () use ($company, $plan, $duration, $receipt, $extension, $reference, $notes): PlanOrder {
            $this->ensureCanOrder($company, $plan, $duration);
            $price = CompanyService::priceFor($plan, $duration);
            if (bccomp($price, '0', 2) === 0) {
                $this->fail('plan_id', __('This plan is free — subscribe to it directly, no payment needed.'));
            }

            $disk = Storage::disk(self::RECEIPT_DISK);
            $path = $disk->putFileAs("billing/receipts/{$company->getKey()}", $receipt, Str::uuid()->toString().'.'.$extension);
            if ($path === false) {
                throw new RuntimeException('The receipt could not be stored.');
            }

            try {
                return $this->createOrder(PlanOrderType::Purchase, $plan, $duration, $price, PaymentMethod::BankTransfer, PlanOrderStatus::Pending, [
                    'payment_reference' => $this->clean($reference),
                    'receipt_path' => $path,
                    'receipt_name' => Str::limit($receipt->getClientOriginalName(), 250, ''),
                    'notes' => $this->clean($notes),
                ]);
            } catch (Throwable $e) {
                $disk->delete($path); // the order wasn't saved: don't keep an orphan file

                throw $e;
            }
        });
    }

    /** Request Plan: a PENDING request with nothing to pay — an admin decides. */
    public function submitRequest(Company $company, Plan $plan, PlanDuration $duration, ?string $notes = null): PlanOrder
    {
        return $this->inCompany($company, function () use ($company, $plan, $duration, $notes): PlanOrder {
            $this->ensureCanOrder($company, $plan, $duration);

            return $this->createOrder(PlanOrderType::Request, $plan, $duration, '0.00', PaymentMethod::Manual, PlanOrderStatus::Pending, [
                'notes' => $this->clean($notes),
            ]);
        });
    }

    /** Start N Day Trial: applied at once, with an approved `trial` order on record. */
    public function startTrial(Company $company, Plan $plan, PlanDuration $duration, ?Carbon $now = null): PlanOrder
    {
        return $this->inCompany($company, function () use ($company, $plan, $duration, $now): PlanOrder {
            $this->ensureAvailable($plan);
            $this->ensureNothingPending();
            if (! $this->hasTrial($plan)) {
                $this->fail('plan_id', __('This plan has no free trial.'));
            }
            if ($company->plan_id === $plan->id) {
                $this->fail('plan_id', __('You\'re already on this plan.'));
            }
            if (in_array($plan->id, $this->usedTrialPlanIds(), true)) {
                $this->fail('plan_id', __('You\'ve already used the free trial of this plan.'));
            }

            $now ??= Carbon::now();
            $endsAt = $now->copy()->addDays($plan->trial_days);
            $order = $this->createOrder(PlanOrderType::Trial, $plan, $duration, '0.00', PaymentMethod::Free, PlanOrderStatus::Approved, ['reviewed_at' => $now]);

            $this->companies->applyPlan($company, $plan, $duration, $endsAt, $endsAt, $company, __(':plan trial started (:days days)', [
                'plan' => $plan->name,
                'days' => $plan->trial_days,
            ]), ['source' => 'trial', 'order' => $order->order_code]);

            return $order;
        });
    }

    /** Subscribe Now on a $0 plan: applied at once (never expires), with an approved order on record. */
    public function subscribeFree(Company $company, Plan $plan, PlanDuration $duration, ?Carbon $now = null): PlanOrder
    {
        return $this->inCompany($company, function () use ($company, $plan, $duration, $now): PlanOrder {
            $this->ensureCanOrder($company, $plan, $duration);
            if (bccomp(CompanyService::priceFor($plan, $duration), '0', 2) !== 0) {
                $this->fail('plan_id', __('This plan isn\'t free — subscribe to it through the checkout.'));
            }

            $now ??= Carbon::now();
            $order = $this->createOrder(PlanOrderType::Purchase, $plan, $duration, '0.00', PaymentMethod::Free, PlanOrderStatus::Approved, ['reviewed_at' => $now]);

            $this->companies->applyPlan($company, $plan, $duration, null, null, $company, __('Switched to :plan (:duration)', [
                'plan' => $plan->name,
                'duration' => $duration->value,
            ]), ['source' => 'free', 'order' => $order->order_code]);

            return $order;
        });
    }

    /* ── Rules ─────────────────────────────────────────────────────────────────────────── */

    /** An active plan, no pending order, and not already the company's plan for that duration. */
    private function ensureCanOrder(Company $company, Plan $plan, PlanDuration $duration): void
    {
        $this->ensureAvailable($plan);
        $this->ensureNothingPending();
        if ($company->plan_id === $plan->id && $company->plan_duration === $duration) {
            $this->fail('plan_id', __('This is already your current plan.'));
        }
    }

    private function ensureAvailable(Plan $plan): void
    {
        if ($plan->trashed() || ! $plan->is_active) {
            $this->fail('plan_id', __('This plan is not available.'));
        }
    }

    private function ensureNothingPending(): void
    {
        if (PlanOrder::query()->pending()->exists()) {
            $this->fail('pending_order', __('You already have a plan request waiting for review. You can submit another once it has been reviewed.'));
        }
    }

    private function hasTrial(Plan $plan): bool
    {
        return $plan->trial_enabled && $plan->trial_days > 0;
    }

    /** @return list<int> plans the company has ever trialled (deleted trial orders still count) */
    private function usedTrialPlanIds(): array
    {
        return PlanOrder::withTrashed()
            ->where('plan_orders.type', PlanOrderType::Trial->value)
            ->distinct()
            ->pluck('plan_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    /** The extension for an allowed receipt, from its detected content type. */
    private function receiptExtension(UploadedFile $receipt): string
    {
        $extension = self::RECEIPT_TYPES[(string) $receipt->getMimeType()] ?? null;
        if ($extension === null) {
            $this->fail('receipt', __('The receipt must be a JPG, PNG or PDF file.'));
        }
        if ($receipt->getSize() > self::RECEIPT_MAX_KB * 1024) {
            $this->fail('receipt', __('The receipt may not be larger than 5 MB.'));
        }

        return $extension;
    }

    /* ── Plumbing ──────────────────────────────────────────────────────────────────────── */

    /**
     * A new order with a fresh code and the price snapshot (no discount yet — coupons are
     * reserved). Must run inside the company's transaction (OrderCode locks the year's codes).
     *
     * @param  array<string, mixed>  $extra
     */
    private function createOrder(PlanOrderType $type, Plan $plan, PlanDuration $duration, string $price, PaymentMethod $method, PlanOrderStatus $status, array $extra = []): PlanOrder
    {
        $order = new PlanOrder;
        $order->forceFill([
            'order_code' => OrderCode::next(),
            'plan_id' => $plan->id,
            'type' => $type,
            'duration' => $duration,
            'price' => $price,
            'discount' => '0.00',
            'final_amount' => bcsub($price, '0', 2),
            'payment_method' => $method,
            'status' => $status,
            ...$extra,
        ])->save();

        return $order->load('plan');
    }

    /**
     * Runs `$callback` in the company's tenancy context and a transaction holding the company
     * row's lock (serialises the pending check and the plan change per company).
     *
     * @template T
     *
     * @param  callable(): T  $callback
     * @return T
     */
    private function inCompany(Company $company, callable $callback): mixed
    {
        return Tenancy::instance()->runAs($company, fn () => DB::transaction(function () use ($company, $callback) {
            Company::query()->whereKey($company->getKey())->lockForUpdate()->first(['id']);
            $company->refresh();

            return $callback();
        }));
    }

    private function clean(?string $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }

    private function fail(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
