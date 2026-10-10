<?php

namespace App\Services;

use App\Exceptions\PlanLimitReached;
use App\Models\Company;
use App\Models\Media;
use App\Models\Plan;
use App\Models\Project;
use App\Support\Tenancy\Tenancy;
use Illuminate\Support\Number;

/**
 * The SaaS plan limits, enforced server-side (the UI hint is never the guard). One place for every
 * limit, so AI and future limits plug in the same way:
 *
 *  - projects: creating a project checks the plan's `max_projects` (-1 = unlimited);
 *  - storage: every media upload checks the company's live media bytes + the new file against
 *    the plan's `storage_limit_gb` (1 GB = 1024³ bytes);
 *  - ai: `ai_integration` (no AI endpoints exist yet — `allowsAi()` is ready for them).
 *
 * The plan is the company's own; a company without one (or whose plan was removed) gets the
 * default plan's limits — never "unlimited" (Phase 0 decision 3). Checks run inside the caller's
 * transaction and lock the company row first, so two requests can't both take the last slot.
 * Editing is never limited: only creating projects and adding bytes are.
 */
class PlanLimitService
{
    private const BYTES_PER_GB = 1073741824; // 1024³

    /** The plan whose limits apply to the current company. */
    public function plan(): ?Plan
    {
        $company = $this->company();

        return $company->plan ?? Plan::query()->active()->where('is_default', true)->first();
    }

    /** Throws PlanLimitReached when one more project would exceed the plan. */
    public function ensureCanCreateProject(): void
    {
        $this->lockCompany();
        $limit = $this->projectLimit();
        if ($limit === Plan::UNLIMITED) {
            return;
        }

        $current = Project::query()->count();
        if ($current >= $limit) {
            throw new PlanLimitReached(
                PlanLimitReached::PROJECTS,
                __('You\'ve reached your plan\'s project limit. Upgrade to add more.'),
                'project',
                ['limit' => $limit, 'current' => $current],
            );
        }
    }

    /** Throws PlanLimitReached when `$bytes` more would exceed the plan's storage. */
    public function ensureCanStore(int $bytes): void
    {
        $this->lockCompany();
        $limit = $this->storageLimitBytes();
        $used = $this->usedStorageBytes();

        if ($used + $bytes > $limit) {
            throw new PlanLimitReached(
                PlanLimitReached::STORAGE,
                __('This file (:size) would take you over your storage limit: you\'ve used :used of :limit. Upgrade or delete files to add more.', [
                    'size' => Number::fileSize($bytes, maxPrecision: 1),
                    'used' => Number::fileSize($used, maxPrecision: 1),
                    'limit' => Number::fileSize($limit, maxPrecision: 1),
                ]),
                'file',
                ['limit_bytes' => $limit, 'used_bytes' => $used, 'file_bytes' => $bytes],
            );
        }
    }

    public function allowsAi(): bool
    {
        return (bool) $this->plan()?->ai_integration;
    }

    /**
     * What the UI shows against the allowance (GET /api/v1/plan-usage).
     *
     * @return array{plan: array{id: int, name: string}|null, projects: array{used: int, limit: int}, storage: array{used_bytes: int, limit_bytes: int}, ai_integration: bool}
     */
    public function usage(): array
    {
        $plan = $this->plan();

        return [
            'plan' => $plan ? ['id' => $plan->id, 'name' => $plan->name] : null,
            'projects' => ['used' => Project::query()->count(), 'limit' => $this->projectLimit()],
            'storage' => ['used_bytes' => $this->usedStorageBytes(), 'limit_bytes' => $this->storageLimitBytes()],
            'ai_integration' => (bool) $plan?->ai_integration,
        ];
    }

    /** -1 = unlimited; 0 when no plan applies at all. */
    private function projectLimit(): int
    {
        return (int) ($this->plan()?->max_projects ?? 0);
    }

    private function storageLimitBytes(): int
    {
        $gb = (string) ($this->plan()?->storage_limit_gb ?? '0');

        return (int) bcmul($gb, (string) self::BYTES_PER_GB, 0);
    }

    private function usedStorageBytes(): int
    {
        return (int) Media::query()->sum('size_bytes');
    }

    private function company(): Company
    {
        return Company::query()->with('plan')->findOrFail(Tenancy::instance()->requireCompanyId());
    }

    /** Serialises limit checks per company for the rest of the transaction (MySQL; no-op on SQLite). */
    private function lockCompany(): void
    {
        Company::query()->whereKey(Tenancy::instance()->requireCompanyId())->lockForUpdate()->first(['id']);
    }
}
