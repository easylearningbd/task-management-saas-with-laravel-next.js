<?php

namespace Database\Seeders;

use App\Enums\CompanyActivityAction;
use App\Enums\PlanDuration;
use App\Enums\UserStatus;
use App\Models\Company;
use App\Models\CompanyActivity;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Seeds the seven companies from the Companies screenshot — all active, login enabled.
 *
 * Idempotent and additive: matches on email (soft-deleted rows included), never truncates or
 * deletes. `company@example.com` already exists from AdminUserSeeder and is reused, never
 * duplicated. Only what the screenshot shows is enforced on every run (name, active, login
 * enabled); the password and the created date are set only when a company is first created,
 * and the plan only when the company has none — so an admin's later changes survive a re-run.
 * Dates are relative to today, never hardcoded.
 *
 * Run: php artisan db:seed --class=CompanySeeder
 */
class CompanySeeder extends Seeder
{
    /** @var list<array{name: string, email: string, plan: string, created_days_ago: int, expires_in_days: int}> */
    private const COMPANIES = [
        ['name' => 'Company', 'email' => 'company@example.com', 'plan' => 'Pro', 'created_days_ago' => 30, 'expires_in_days' => 30],
        ['name' => 'Healthcare Systems', 'email' => 'admin@healthcare.com', 'plan' => 'Pro', 'created_days_ago' => 28, 'expires_in_days' => 27],
        ['name' => 'Financial Services', 'email' => 'admin@financial.com', 'plan' => 'Starter', 'created_days_ago' => 25, 'expires_in_days' => 21],
        ['name' => 'Manufacturing Corp', 'email' => 'admin@manufacturing.com', 'plan' => 'Pro', 'created_days_ago' => 21, 'expires_in_days' => 14],
        ['name' => 'Creative Agency', 'email' => 'admin@creativeagency.com', 'plan' => 'Free', 'created_days_ago' => 14, 'expires_in_days' => 0],
        ['name' => 'Tech Solutions Inc', 'email' => 'admin@techsolutions.com', 'plan' => 'Pro', 'created_days_ago' => 10, 'expires_in_days' => 9],
        ['name' => 'Global Enterprises', 'email' => 'admin@globalenterprises.com', 'plan' => 'Starter', 'created_days_ago' => 7, 'expires_in_days' => 3],
    ];

    public function run(): void
    {
        if (app()->isProduction()) {
            $this->command?->error('CompanySeeder uses the default password "password" and will not run in production.');

            return;
        }

        $plans = Plan::query()->whereIn('name', array_column(self::COMPANIES, 'plan'))->get()->keyBy('name');
        $today = Carbon::today();

        foreach (self::COMPANIES as $row) {
            // The email must not belong to a non-company account (e.g. a super admin).
            if (User::withTrashed()->where('email', $row['email'])->where('type', '!=', 'company')->exists()) {
                $this->command?->warn(sprintf('  %-28s skipped — the email belongs to a non-company user', $row['email']));

                continue;
            }

            $company = Company::withTrashed()->firstOrNew(['email' => $row['email']]);
            $isNew = ! $company->exists;

            $company->forceFill([
                'name' => $row['name'],
                'status' => UserStatus::Active,
                'is_login_enabled' => true,
                'deleted_at' => null,
            ]);

            $created = $today->copy()->subDays($row['created_days_ago'])->setTime(9, 0);
            if ($isNew) {
                $company->forceFill([
                    'password' => 'password',
                    'email_verified_at' => $created,
                    'created_at' => $created,
                    'updated_at' => $created,
                ]);
            } elseif ($company->created_at === null || $company->created_at->greaterThan($created)) {
                // An existing account (the M1 demo company) takes the screenshot's relative date —
                // only ever moved earlier, so a re-run on a later day leaves it alone.
                $company->created_at = $created;
            }

            $plan = $plans->get($row['plan']);
            $assignPlan = $plan && $company->plan_id === null;
            if ($assignPlan) {
                $company->forceFill([
                    'plan_id' => $plan->id,
                    'plan_duration' => PlanDuration::Monthly,
                    // The Free plan never expires; paid plans run for the given number of days.
                    'plan_expires_at' => $row['plan'] === 'Free' ? null : $today->copy()->addDays($row['expires_in_days'])->setTime(23, 59),
                    'trial_ends_at' => null,
                ]);
            }

            $action = match (true) {
                $isNew => 'created',
                $company->isDirty() => 'updated',
                default => 'unchanged',
            };
            if ($action === 'unchanged') {
                $this->command?->line(sprintf('  %-28s %-8s unchanged', $row['email'], $row['plan']));

                continue;
            }

            $company->save(); // an explicitly set created_at is kept on insert

            if ($isNew) {
                $this->logSeeded($company, CompanyActivityAction::Created, __('Company created'), ['plan' => $row['plan'], 'seeded' => true], $company->created_at);
            } elseif ($assignPlan) {
                $this->logSeeded($company, CompanyActivityAction::PlanChanged, __('Plan changed to :plan (:duration)', ['plan' => $row['plan'], 'duration' => 'monthly']), ['to' => ['plan' => $row['plan'], 'duration' => 'monthly'], 'seeded' => true]);
            }

            $this->command?->line(sprintf('  %-28s %-8s %s%s', $row['email'], $row['plan'], $action, $assignPlan && ! $isNew ? ' (plan assigned)' : ''));
        }
    }

    /**
     * A system entry (no actor) so the demo companies have a history from day one.
     *
     * @param  array<string, mixed>  $meta
     */
    private function logSeeded(Company $company, CompanyActivityAction $action, string $description, array $meta, ?Carbon $at = null): void
    {
        $activity = new CompanyActivity(['action' => $action, 'description' => $description, 'meta' => $meta]);
        $activity->company_id = $company->getKey();
        $activity->actor_id = null;
        if ($at) {
            $activity->created_at = $at;
            $activity->updated_at = $at;
        }
        $activity->save();
    }
}
