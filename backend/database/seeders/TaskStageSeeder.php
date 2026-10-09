<?php

namespace Database\Seeders;

use App\Enums\TaskStageStatus;
use App\Models\Company;
use App\Models\TaskStage;
use App\Services\CompanySetupService;
use App\Support\Tenancy\Tenancy;
use Illuminate\Database\Seeder;

/**
 * Task stages — idempotent and additive: matched on (company, name) case-insensitively, deleted
 * rows included; never deletes or truncates. Every write happens inside Tenancy::runAs(), so
 * BelongsToCompany stamps the right `company_id`.
 *
 *  1. company@example.com and admin@healthcare.com: the four defaults (CompanySetupService —
 *     the same code that provisions a new company), so the demo company matches the Task Stages
 *     screenshot exactly (4 stages, all active, "Done" the done stage).
 *  2. Every other existing company that has no stages yet: the four defaults too (they were
 *     created before CompanySetupService provisioned stages). A company that already has stages
 *     is left alone.
 *  3. admin@healthcare.com also gets two of its own after the defaults — one inactive, so the
 *     Inactive Stages card and the status filter can be exercised — making tenant isolation
 *     visible by hand (both companies have "To Do"; only Healthcare has "Under Review").
 *
 * Run: php artisan db:seed --class=TaskStageSeeder
 */
class TaskStageSeeder extends Seeder
{
    private const DEMO_COMPANIES = ['company@example.com', 'admin@healthcare.com'];

    /** @var array<string, list<array{name: string, description: string, color: string, status: string}>> */
    private const EXTRA = [
        'admin@healthcare.com' => [
            ['name' => 'Under Review', 'description' => 'Tasks waiting for a clinical review', 'color' => '#8B5CF6', 'status' => 'active'],
            ['name' => 'On Hold', 'description' => 'Tasks paused until further notice', 'color' => '#F59E0B', 'status' => 'inactive'],
        ],
    ];

    public function run(CompanySetupService $setup): void
    {
        $tenancy = Tenancy::instance();

        foreach (Company::query()->orderBy('id')->get() as $company) {
            $isDemo = in_array($company->email, self::DEMO_COMPANIES, true);
            $hasAny = $tenancy->runAs($company, fn (): bool => TaskStage::withTrashed()->exists());

            if (! $isDemo && $hasAny) {
                $this->command?->line(sprintf('  %-34s has stages — left alone', $company->email));

                continue;
            }

            $defaults = $setup->seedTaskStages($company);
            $extras = $this->seedExtras($company, self::EXTRA[$company->email] ?? []);

            $this->command?->info(sprintf(
                '  %-34s defaults: %d new%s',
                $company->email,
                $defaults,
                isset(self::EXTRA[$company->email]) ? sprintf(' · own: %d (%d new)', count(self::EXTRA[$company->email]), $extras) : '',
            ));
        }
    }

    /**
     * Each extra goes after the company's last stage the first time; a re-run only refreshes its
     * values (its place in the order is the company's to change).
     *
     * @param  list<array{name: string, description: string, color: string, status: string}>  $rows
     */
    private function seedExtras(Company $company, array $rows): int
    {
        if ($rows === []) {
            return 0;
        }

        return Tenancy::instance()->runAs($company, function () use ($rows): int {
            $created = 0;
            foreach ($rows as $row) {
                $stage = TaskStage::withTrashed()->named($row['name'])->first();
                $values = [
                    'name' => $row['name'],
                    'description' => $row['description'],
                    'color' => $row['color'],
                    'status' => TaskStageStatus::from($row['status']),
                ];

                if ($stage === null) {
                    TaskStage::create([...$values, 'order' => (int) TaskStage::query()->max('order') + 1]);
                    $created++;
                } elseif ($stage->trashed()) {
                    // A deleted demo stage comes back at the end, keeping the order contiguous.
                    $stage->fill([...$values, 'order' => (int) TaskStage::query()->max('order') + 1]);
                    $stage->restore();
                } else {
                    $stage->fill($values)->save();
                }
            }

            return $created;
        });
    }
}
