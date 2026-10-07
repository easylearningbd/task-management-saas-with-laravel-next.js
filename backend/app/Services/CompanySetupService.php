<?php

namespace App\Services;

use App\Enums\PlanDuration;
use App\Models\Company;
use App\Models\Plan;
use Illuminate\Support\Carbon;

/**
 * Everything a brand-new company gets (CLAUDE.md §7: "On company creation, CompanySetupService
 * seeds default task stages, expense categories and settings, and assigns the default plan").
 *
 * Today only the plan exists, so only the plan is assigned.
 * TODO(task-stages): seed To Do / In Progress / Cancelled / Done (CLAUDE.md §13) once the
 *   task_stages table exists.
 * TODO(expense-categories): seed Travel / Office Supplies / Software / Marketing / Meals
 *   (CLAUDE.md §13) once the expense_categories table exists.
 * TODO(settings): seed per-company settings once the settings module exists.
 *
 * Must run inside the caller's transaction (CompanyService::create does).
 */
class CompanySetupService
{
    public function setUp(Company $company): void
    {
        $this->assignDefaultPlan($company);
    }

    /**
     * The default plan, billed monthly. A plan with a trial starts its trial now; a free plan
     * (price 0) never expires; a paid plan without a trial runs for one month.
     * No default plan configured → the company simply has no plan yet.
     */
    public function assignDefaultPlan(Company $company, ?Carbon $now = null): void
    {
        $plan = Plan::query()->active()->where('is_default', true)->first();
        if (! $plan) {
            return;
        }

        $now ??= Carbon::now();
        $isFree = bccomp((string) $plan->monthly_price, '0', 2) === 0;

        $company->forceFill([
            'plan_id' => $plan->id,
            'plan_duration' => PlanDuration::Monthly,
            'trial_ends_at' => $plan->trial_enabled ? $now->copy()->addDays($plan->trial_days) : null,
            'plan_expires_at' => match (true) {
                $plan->trial_enabled => $now->copy()->addDays($plan->trial_days),
                $isFree => null,
                default => $now->copy()->addMonthNoOverflow(),
            },
        ])->save();
    }
}
