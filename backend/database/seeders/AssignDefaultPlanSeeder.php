<?php

namespace Database\Seeders;

use App\Models\Company;
use App\Services\CompanySetupService;
use Illuminate\Database\Seeder;

/**
 * Puts every company that has no plan on the default plan (Phase 0 decision 3) — the companies
 * created before CompanySetupService assigned one. Idempotent and additive: a company that
 * already has a plan is never touched; nothing is deleted.
 *
 * Run: php artisan db:seed --class=AssignDefaultPlanSeeder
 */
class AssignDefaultPlanSeeder extends Seeder
{
    public function run(CompanySetupService $setup): void
    {
        $companies = Company::query()->whereNull('plan_id')->orderBy('id')->get();
        if ($companies->isEmpty()) {
            $this->command?->line('  every company already has a plan — nothing to do');

            return;
        }

        foreach ($companies as $company) {
            $setup->assignDefaultPlan($company);
            $company->refresh()->load('plan');
            $this->command?->info(sprintf('  %-34s → %s', $company->email, $company->plan?->name ?? 'no default plan configured'));
        }
    }
}
