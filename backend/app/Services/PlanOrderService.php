<?php

namespace App\Services;

use App\Enums\PlanOrderStatus;
use App\Models\Company;
use App\Models\PlanOrder;
use App\Models\User;
use App\Support\Tenancy\CrossTenant;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * The super admin's side of billing: reviewing pending plan orders (PRD §8.4–8.5; the admin UI is
 * a later task — Billing Phase 3 exposes these as API endpoints). Orders are tenant-owned, so the
 * admin reads them across companies through CrossTenant, never withoutGlobalScopes().
 *
 *  - approve: the order is locked and must still be pending; its plan must still be active. Then,
 *    in ONE transaction, CompanyService::applyPlan() sets the company's `plan_id`,
 *    `plan_duration`, `plan_expires_at` (now + 1 month / 1 year; never for a $0 plan) and clears
 *    `trial_ends_at`, logging "Plan changed"; and the order is stamped approved with
 *    `reviewed_by` / `reviewed_at`. The limits follow by themselves: PlanLimitService reads the
 *    company's live plan.
 *  - reject: status rejected, the reason and reviewer stored — nothing about the company changes.
 */
class PlanOrderService
{
    public function __construct(private readonly CompanyService $companies) {}

    /** An order by id, whatever its company (admin only — CrossTenant refuses a company context). */
    public function find(int $id): PlanOrder
    {
        return CrossTenant::query(PlanOrder::class)->with(['plan', 'company', 'reviewer'])->findOrFail($id);
    }

    /**
     * Every company's orders (the admin list), with the company, plan and reviewer.
     *
     * @param  array{search?: ?string, status?: ?string, type?: ?string, plan_id?: ?int}  $filters
     * @return Builder<PlanOrder>
     */
    public function query(array $filters): Builder
    {
        return CrossTenant::query(PlanOrder::class)->with(['plan', 'company', 'reviewer'])->filter($filters, withCompany: true);
    }

    public function approve(PlanOrder $order, User $admin, ?Carbon $now = null): PlanOrder
    {
        return DB::transaction(function () use ($order, $admin, $now): PlanOrder {
            $order = $this->lockPending($order);
            $plan = $order->plan;
            if ($plan === null || $plan->trashed() || ! $plan->is_active) {
                $this->fail('order', __('This plan is no longer available. Reject the order instead.'));
            }

            $now ??= Carbon::now();
            /** @var Company $company */
            $company = Company::query()->whereKey($order->company_id)->lockForUpdate()->firstOrFail();

            $this->companies->applyPlan(
                $company,
                $plan,
                $order->duration,
                CompanyService::expiryForPlan($plan, $order->duration, $now),
                null,
                $admin,
                __('Plan changed to :plan (:duration) — order :code approved', [
                    'plan' => $plan->name,
                    'duration' => $order->duration->value,
                    'code' => $order->order_code,
                ]),
                ['source' => 'order', 'order' => $order->order_code],
            );

            $order->forceFill([
                'status' => PlanOrderStatus::Approved,
                'reviewed_by' => $admin->getKey(),
                'reviewed_at' => $now,
            ])->save();

            return $order->load(['plan', 'company', 'reviewer']);
        });
    }

    public function reject(PlanOrder $order, User $admin, string $reason, ?Carbon $now = null): PlanOrder
    {
        return DB::transaction(function () use ($order, $admin, $reason, $now): PlanOrder {
            $order = $this->lockPending($order);

            $order->forceFill([
                'status' => PlanOrderStatus::Rejected,
                'rejection_reason' => trim($reason),
                'reviewed_by' => $admin->getKey(),
                'reviewed_at' => $now ?? Carbon::now(),
            ])->save();

            return $order->load(['plan', 'company', 'reviewer']);
        });
    }

    /** Re-reads the order under a row lock; only a pending order can be reviewed (once). */
    private function lockPending(PlanOrder $order): PlanOrder
    {
        $locked = CrossTenant::query(PlanOrder::class)->with('plan')->lockForUpdate()->findOrFail($order->getKey());
        if ($locked->status !== PlanOrderStatus::Pending) {
            $this->fail('order', __('This order has already been :status.', ['status' => strtolower($locked->status->label())]));
        }

        return $locked;
    }

    private function fail(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
