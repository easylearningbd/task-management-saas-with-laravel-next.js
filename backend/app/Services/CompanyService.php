<?php

namespace App\Services;

use App\Enums\CompanyActivityAction;
use App\Enums\PlanDuration;
use App\Enums\UserStatus;
use App\Models\Company;
use App\Models\CompanyActivity;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Every company business rule (task spec; CLAUDE.md §6/§7). Each change and the
 * `company_activities` row that records it are written in one transaction — exactly one row
 * per action, with the acting super admin as `actor_id`.
 *
 * Passwords: a company created with Enable Login off gets an unguessable random password
 * (`password` is NOT NULL; Phase 0 decision A), so it cannot sign in. Whether a company has a
 * password someone actually chose is read from its log: `meta.password_set` is written on
 * create, on an update that sets a password and on a reset. A company with no such entry was
 * created elsewhere (registration, seeders) with a real password.
 *
 * `status` (active/inactive) and `is_login_enabled` are independent flags: nothing here ever
 * derives one from the other.
 */
class CompanyService
{
    public function __construct(private readonly CompanySetupService $setup) {}

    /**
     * The admin list, filtered (sorting and pagination are applied by ListQuery). Companies
     * only — the Company scope means super admins can never appear, whatever the filters.
     *
     * @param  array{search?: ?string, status?: ?string, plan_id?: ?int, created_from?: ?string, created_to?: ?string}  $filters
     * @return Builder<Company>
     */
    public function query(array $filters): Builder
    {
        return Company::query()
            ->with('plan')
            ->search($filters['search'] ?? null)
            ->when($filters['status'] ?? null, fn (Builder $q, string $status) => $q->where('status', $status))
            ->when($filters['plan_id'] ?? null, fn (Builder $q, int $planId) => $q->where('plan_id', $planId))
            ->when($filters['created_from'] ?? null, fn (Builder $q, string $from) => $q->whereDate('created_at', '>=', $from))
            ->when($filters['created_to'] ?? null, fn (Builder $q, string $to) => $q->whereDate('created_at', '<=', $to));
    }

    /**
     * The activity log — one company's, or every company's — with the company and the actor
     * eager-loaded (deleted ones included).
     *
     * @return Builder<CompanyActivity>
     */
    public function activityQuery(?Company $company, ?string $action = null): Builder
    {
        return CompanyActivity::query()
            ->with(['company', 'actor'])
            ->when($company, fn (Builder $q, Company $c) => $q->where('company_id', $c->getKey()))
            ->when($action, fn (Builder $q, string $a) => $q->where('action', $a));
    }

    /**
     * @param  array{name: string, email: string, enable_login?: bool, password?: ?string}  $data  validated input
     */
    public function create(array $data, ?User $actor): Company
    {
        return DB::transaction(function () use ($data, $actor): Company {
            $loginEnabled = (bool) ($data['enable_login'] ?? false);
            $password = $loginEnabled ? ($data['password'] ?? null) : null;
            if ($loginEnabled && ($password === null || $password === '')) {
                throw ValidationException::withMessages(['password' => __('A password is required when login is enabled.')]);
            }

            $company = new Company;
            $company->fill(['name' => $data['name'], 'email' => $data['email']]);
            $company->forceFill([
                // Login off: a random password nobody knows (the account cannot sign in).
                'password' => $password ?? Str::random(64),
                'status' => UserStatus::Active,
                'is_login_enabled' => $loginEnabled,
            ])->save();

            $this->setup->setUp($company);
            $company->load('plan');

            $this->log($company, CompanyActivityAction::Created, $actor, __('Company created'), [
                'plan' => $company->plan?->name,
                'login_enabled' => $loginEnabled,
                'password_set' => $password !== null,
            ]);

            return $company;
        });
    }

    /**
     * @param  array{name?: string, email?: string, status?: string|UserStatus, enable_login?: bool, password?: ?string}  $data  validated input
     */
    public function update(Company $company, array $data, ?User $actor): Company
    {
        return DB::transaction(function () use ($company, $data, $actor): Company {
            $password = $data['password'] ?? null;
            $password = $password === '' ? null : $password; // blank = keep the current password

            $company->fill(collect($data)->only(['name', 'email'])->all());
            if (array_key_exists('status', $data)) {
                $company->status = $data['status'] instanceof UserStatus ? $data['status'] : UserStatus::from($data['status']);
            }
            if (array_key_exists('enable_login', $data)) {
                $enable = (bool) $data['enable_login'];
                if ($enable && ! $company->is_login_enabled && $password === null && ! $this->hasUsablePassword($company)) {
                    throw ValidationException::withMessages([
                        'password' => __('This company has no password yet. Set one to enable login.'),
                    ]);
                }
                $company->is_login_enabled = $enable;
            }
            if ($password !== null) {
                $company->password = $password;
            }

            $changed = array_keys($company->getDirty());
            $company->save();

            $this->log($company, CompanyActivityAction::Updated, $actor, __('Company updated'), array_filter([
                'changed' => $changed, // field names only — never values (no password hashes in the log)
                'password_set' => $password !== null ? true : null,
            ], fn ($value) => $value !== null));

            return $company->refresh();
        });
    }

    /** Soft delete. The log row is written first; the history stays readable afterwards. */
    public function delete(Company $company, ?User $actor): void
    {
        DB::transaction(function () use ($company, $actor): void {
            $this->log($company, CompanyActivityAction::Deleted, $actor, __('Company deleted'));
            $company->delete();
        });
    }

    /** Flip `is_login_enabled` (never touches `status`). */
    public function toggleLogin(Company $company, ?User $actor): Company
    {
        return DB::transaction(function () use ($company, $actor): Company {
            $enable = ! $company->is_login_enabled;
            if ($enable && ! $this->hasUsablePassword($company)) {
                throw ValidationException::withMessages([
                    'is_login_enabled' => __('This company has no password yet. Reset its password to enable login.'),
                ]);
            }

            $company->is_login_enabled = $enable;
            $company->save();

            $this->log(
                $company,
                $enable ? CompanyActivityAction::LoginEnabled : CompanyActivityAction::LoginDisabled,
                $actor,
                $enable ? __('Login enabled') : __('Login disabled'),
            );

            return $company;
        });
    }

    /**
     * Set a new password. The old one stops working at once; the company's open sessions are
     * ended and its "remember me" token rotated, so nobody stays signed in with the old one.
     */
    public function resetPassword(Company $company, string $password, ?User $actor): Company
    {
        return DB::transaction(function () use ($company, $password, $actor): Company {
            $company->password = $password;
            $company->setRememberToken(Str::random(60));
            $company->save();

            DB::table('sessions')->where('user_id', $company->getKey())->delete();

            $this->log($company, CompanyActivityAction::PasswordReset, $actor, __('Password reset'), ['password_set' => true]);

            return $company;
        });
    }

    /**
     * Manual plan assignment by an admin — no payment, invoice or plan order. Expiry is now + 1
     * month or + 1 year; any trial ends.
     */
    public function changePlan(Company $company, Plan $plan, PlanDuration $duration, ?User $actor, ?Carbon $now = null): Company
    {
        if ($plan->trashed() || ! $plan->is_active) {
            throw ValidationException::withMessages(['plan_id' => __('This plan is not available.')]);
        }

        return DB::transaction(function () use ($company, $plan, $duration, $actor, $now): Company {
            $now ??= Carbon::now();
            $from = ['plan' => $company->plan?->name, 'duration' => $company->plan_duration?->value];

            $company->forceFill([
                'plan_id' => $plan->id,
                'plan_duration' => $duration,
                'plan_expires_at' => self::expiryFor($duration, $now),
                'trial_ends_at' => null,
            ])->save();

            $this->log($company, CompanyActivityAction::PlanChanged, $actor, __('Plan changed to :plan (:duration)', [
                'plan' => $plan->name,
                'duration' => $duration->value,
            ]), ['from' => $from, 'to' => ['plan' => $plan->name, 'duration' => $duration->value]]);

            return $company->load('plan');
        });
    }

    /** now + 1 month (no overflow: Jan 31 → Feb 28) or + 1 year. */
    public static function expiryFor(PlanDuration $duration, Carbon $from): Carbon
    {
        return $duration === PlanDuration::Yearly
            ? $from->copy()->addYearNoOverflow()
            : $from->copy()->addMonthNoOverflow();
    }

    /**
     * True unless the latest password-related log entry says no password was set (a company
     * created with login off and never given one).
     */
    public function hasUsablePassword(Company $company): bool
    {
        $latest = CompanyActivity::query()
            ->where('company_id', $company->getKey())
            ->whereNotNull('meta->password_set')
            ->latestFirst()
            ->first();

        return (bool) ($latest?->meta['password_set'] ?? true);
    }

    /**
     * Record an action that happened elsewhere (e.g. ImpersonationService) in the company's
     * log. Call it inside the same transaction as the change it records.
     *
     * @param  array<string, mixed>  $meta
     */
    public function record(Company $company, CompanyActivityAction $action, ?User $actor, ?string $description = null, array $meta = []): CompanyActivity
    {
        return $this->log($company, $action, $actor, $description, $meta);
    }

    /**
     * @param  array<string, mixed>  $meta
     */
    private function log(Company $company, CompanyActivityAction $action, ?User $actor, ?string $description = null, array $meta = []): CompanyActivity
    {
        $activity = new CompanyActivity([
            'action' => $action,
            'description' => $description,
            'meta' => $meta === [] ? null : $meta,
        ]);
        $activity->company_id = $company->getKey();
        $activity->actor_id = $actor?->getKey();
        $activity->save();

        return $activity;
    }
}
