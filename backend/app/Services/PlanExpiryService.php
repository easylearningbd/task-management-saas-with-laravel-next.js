<?php

namespace App\Services;

use App\Enums\PlanDuration;
use App\Models\Company;
use App\Models\Plan;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Billing rule 10 — the daily `plans:expire` job: a company whose `trial_ends_at` or
 * `plan_expires_at` has passed goes back to the DEFAULT plan (monthly; a $0 default never
 * expires, so it is never picked up again). Through CompanyService::applyPlan(), so it is logged
 * as "Plan changed" with `source: expiry` and the actor null (the system).
 *
 *  - Idempotent: a second run finds nothing (the moved company no longer has a past date), and
 *    each company is re-checked under its row lock, so two overlapping runs can't move it twice.
 *  - Keeps data: only the plan fields change — projects, files and everything else stay; the
 *    smaller limits only block new projects and uploads.
 *  - No default plan configured → nothing is moved (logged as a warning).
 */
class PlanExpiryService
{
    public function __construct(private readonly CompanyService $companies) {}

    /**
     * @return array{moved: list<array{id: int, email: string, from: string|null, reason: string}>, default: string|null}
     */
    public function expireDue(?Carbon $now = null, bool $dryRun = false): array
    {
        $now ??= Carbon::now();
        $default = Plan::query()->active()->where('is_default', true)->first();
        if ($default === null) {
            Log::warning('plans:expire — no active default plan; nothing moved.');

            return ['moved' => [], 'default' => null];
        }

        $moved = [];
        foreach ($this->dueIds($now) as $id) {
            $result = DB::transaction(function () use ($id, $now, $default, $dryRun): ?array {
                /** @var Company|null $company */
                $company = Company::query()->with('plan')->whereKey($id)->lockForUpdate()->first();
                if ($company === null || ! $this->isDue($company, $now)) {
                    return null; // moved meanwhile
                }

                $reason = $company->trial_ends_at !== null && $company->trial_ends_at->lte($now) ? 'trial_ended' : 'plan_expired';
                $entry = ['id' => (int) $company->getKey(), 'email' => $company->email, 'from' => $company->plan?->name, 'reason' => $reason];
                if ($dryRun) {
                    return $entry;
                }

                $this->companies->applyPlan(
                    $company,
                    $default,
                    PlanDuration::Monthly,
                    CompanyService::expiryForPlan($default, PlanDuration::Monthly, $now),
                    null,
                    null,
                    $reason === 'trial_ended'
                        ? __('Trial ended — moved to :plan', ['plan' => $default->name])
                        : __('Plan expired — moved to :plan', ['plan' => $default->name]),
                    ['source' => 'expiry', 'reason' => $reason],
                );

                return $entry;
            });

            if ($result !== null) {
                $moved[] = $result;
            }
        }

        if (! $dryRun) {
            Log::info('plans:expire — moved '.count($moved).' compan'.(count($moved) === 1 ? 'y' : 'ies').' to '.$default->name.'.', ['companies' => $moved]);
        }

        return ['moved' => $moved, 'default' => $default->name];
    }

    /** @return list<int> */
    private function dueIds(Carbon $now): array
    {
        return Company::query()
            ->where(fn ($q) => $q
                ->where(fn ($t) => $t->whereNotNull('trial_ends_at')->where('trial_ends_at', '<=', $now))
                ->orWhere(fn ($p) => $p->whereNotNull('plan_expires_at')->where('plan_expires_at', '<=', $now)))
            ->orderBy('id')
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    private function isDue(Company $company, Carbon $now): bool
    {
        return ($company->trial_ends_at !== null && $company->trial_ends_at->lte($now))
            || ($company->plan_expires_at !== null && $company->plan_expires_at->lte($now));
    }
}
