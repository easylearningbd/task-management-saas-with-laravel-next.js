<?php

namespace App\Services;

use App\Enums\ExpenseCategoryStatus;
use App\Enums\PlanDuration;
use App\Models\Company;
use App\Models\ExpenseCategory;
use App\Models\Plan;
use App\Support\Tenancy\Tenancy;
use Illuminate\Support\Carbon;

/**
 * Everything a brand-new company gets (CLAUDE.md §7: "On company creation, CompanySetupService
 * seeds default task stages, expense categories and settings, and assigns the default plan").
 *
 * Today: the default plan and the five default expense categories.
 * TODO(task-stages): seed To Do / In Progress / Cancelled / Done (CLAUDE.md §13) once the
 *   task_stages table exists.
 * TODO(settings): seed per-company settings once the settings module exists.
 *
 * Must run inside the caller's transaction (CompanyService::create and
 * AuthService::registerCompany do). Safe to run again: nothing is duplicated.
 */
class CompanySetupService
{
    /**
     * CLAUDE.md §13 / PRD §6.14 — every company starts with these.
     *
     * @var list<array{name: string, color: string, description: string}>
     */
    public const DEFAULT_EXPENSE_CATEGORIES = [
        ['name' => 'Travel', 'color' => '#3B82F6', 'description' => 'Travel and transportation expenses'],
        ['name' => 'Office Supplies', 'color' => '#10B77F', 'description' => 'Office equipment and supplies'],
        ['name' => 'Software', 'color' => '#8B5CF6', 'description' => 'Software licenses and subscriptions'],
        ['name' => 'Marketing', 'color' => '#F59E0B', 'description' => 'Marketing and advertising expenses'],
        ['name' => 'Meals', 'color' => '#EF4444', 'description' => 'Business meals and entertainment'],
    ];

    public function setUp(Company $company): void
    {
        $this->assignDefaultPlan($company);
        $this->seedExpenseCategories($company);
    }

    /**
     * The five default expense categories, written inside the company's tenancy context (the
     * caller is usually a super admin, or a guest registering — neither is a company, so
     * BelongsToCompany would otherwise refuse the write). Idempotent: a default is created only
     * when the company has no category of that name, deleted ones included, so a default the
     * company deleted is not brought back. Returns how many were created.
     */
    public function seedExpenseCategories(Company $company): int
    {
        return Tenancy::instance()->runAs($company, function (): int {
            $created = 0;
            foreach (self::DEFAULT_EXPENSE_CATEGORIES as $default) {
                if (ExpenseCategory::withTrashed()->named($default['name'])->exists()) {
                    continue;
                }

                ExpenseCategory::create([...$default, 'status' => ExpenseCategoryStatus::Active]);
                $created++;
            }

            return $created;
        });
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
