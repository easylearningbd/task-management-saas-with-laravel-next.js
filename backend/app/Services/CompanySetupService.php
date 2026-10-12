<?php

namespace App\Services;

use App\Enums\ExpenseCategoryStatus;
use App\Enums\PlanDuration;
use App\Enums\TaskStageStatus;
use App\Models\Company;
use App\Models\ExpenseCategory;
use App\Models\Plan;
use App\Models\Setting;
use App\Models\TaskStage;
use App\Models\Tax;
use App\Support\Tenancy\Tenancy;
use Illuminate\Support\Carbon;

/**
 * Everything a brand-new company gets (CLAUDE.md §7: "On company creation, CompanySetupService
 * seeds default task stages, expense categories and settings, and assigns the default plan").
 *
 * Today: the default plan, the four default task stages, the five default expense categories, the
 * three default tax rates and the invoice "Billed From" settings (the company's own name and email,
 * placeholder address lines — editable from the invoice page until the Settings page exists).
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

    /**
     * CLAUDE.md §13 / PRD §6.13 — every company's workflow starts with these, in this order;
     * "Done" is the done stage. Cancelled has no colour in §13 or the design: #6B7280, the grey
     * of To Do (Phase 0).
     *
     * @var list<array{name: string, color: string, description: string, is_done_stage: bool}>
     */
    public const DEFAULT_TASK_STAGES = [
        ['name' => 'To Do', 'color' => '#6B7280', 'description' => 'Tasks that are planned but not yet started', 'is_done_stage' => false],
        ['name' => 'In Progress', 'color' => '#3B82F6', 'description' => 'Tasks that are currently being worked on', 'is_done_stage' => false],
        ['name' => 'Cancelled', 'color' => '#6B7280', 'description' => 'Tasks that have been cancelled', 'is_done_stage' => false],
        ['name' => 'Done', 'color' => '#10B981', 'description' => 'Tasks that are completed', 'is_done_stage' => true],
    ];

    /**
     * Every company's tax rates (Invoices Phase 0 decision C) — offered on the invoice form.
     *
     * @var list<array{name: string, rate: string}>
     */
    public const DEFAULT_TAXES = [
        ['name' => 'VAT', 'rate' => '10.00'],
        ['name' => 'Sales Tax', 'rate' => '5.00'],
        ['name' => 'Service Tax', 'rate' => '15.00'],
    ];

    /**
     * The invoice "Billed From" placeholders, beside the company's own name and email.
     *
     * @var array<string, string>
     */
    public const DEFAULT_INVOICE_ADDRESS = [
        'invoice_phone' => '+1-555-0123',
        'invoice_address' => '123 Business Street',
        'invoice_city' => 'New York',
        'invoice_state' => 'NY',
        'invoice_zip' => '10001',
        'invoice_country' => 'United States',
    ];

    public function setUp(Company $company): void
    {
        $this->assignDefaultPlan($company);
        $this->seedTaskStages($company);
        $this->seedExpenseCategories($company);
        $this->seedTaxes($company);
        $this->seedInvoiceSettings($company);
    }

    /**
     * The three default tax rates, in the company's tenancy context. Idempotent: a default is
     * created only when the company has no tax of that name, deleted ones included (a tax the
     * company removed isn't brought back). Returns how many were created.
     */
    public function seedTaxes(Company $company): int
    {
        return Tenancy::instance()->runAs($company, function (): int {
            $created = 0;
            foreach (self::DEFAULT_TAXES as $default) {
                if (Tax::withTrashed()->named($default['name'])->exists()) {
                    continue;
                }

                Tax::create([...$default, 'is_active' => true]);
                $created++;
            }

            return $created;
        });
    }

    /**
     * The invoice "Billed From" settings: the company's name and email, and placeholder phone and
     * address lines. Idempotent: only a key the company doesn't have yet is written — a value the
     * company already edited is never overwritten. Returns how many keys were created.
     */
    public function seedInvoiceSettings(Company $company): int
    {
        $existing = Setting::query()->forCompany($company->id)->whereIn('key', Setting::INVOICE_KEYS)->pluck('key')->all();
        $defaults = [
            'invoice_company_name' => $company->name,
            'invoice_email' => $company->email,
            ...self::DEFAULT_INVOICE_ADDRESS,
        ];

        $created = 0;
        foreach (Setting::INVOICE_KEYS as $key) {
            if (in_array($key, $existing, true)) {
                continue;
            }
            Setting::putForCompany($company->id, $key, $defaults[$key]);
            $created++;
        }

        return $created;
    }

    /**
     * The four default task stages, written inside the company's tenancy context (see
     * seedExpenseCategories()). Idempotent: a default is created only when the company has no
     * stage of that name, deleted ones included; a new one goes after the company's last stage,
     * so the order stays contiguous. Afterwards the company has exactly one done stage: if it
     * has none, "Done" becomes it (when it exists). Returns how many stages were created.
     */
    public function seedTaskStages(Company $company): int
    {
        return Tenancy::instance()->runAs($company, function (): int {
            $created = 0;
            foreach (self::DEFAULT_TASK_STAGES as $default) {
                if (TaskStage::withTrashed()->named($default['name'])->exists()) {
                    continue;
                }

                TaskStage::create([
                    ...$default,
                    'is_done_stage' => false,
                    'status' => TaskStageStatus::Active,
                    'order' => (int) TaskStage::query()->max('order') + 1,
                ]);
                $created++;
            }

            if (! TaskStage::query()->where('is_done_stage', true)->exists()) {
                $done = collect(self::DEFAULT_TASK_STAGES)->firstWhere('is_done_stage', true);
                TaskStage::query()->named($done['name'])->first()
                    ?->forceFill(['is_done_stage' => true, 'status' => TaskStageStatus::Active])->save();
            }

            return $created;
        });
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
