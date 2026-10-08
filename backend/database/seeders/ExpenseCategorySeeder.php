<?php

namespace Database\Seeders;

use App\Enums\ExpenseCategoryStatus;
use App\Models\Company;
use App\Models\ExpenseCategory;
use App\Services\CompanySetupService;
use App\Support\Tenancy\Tenancy;
use Illuminate\Database\Seeder;

/**
 * Expense categories — idempotent and additive: matched on (company, name) case-insensitively,
 * deleted rows included; never deletes or truncates. Every write happens inside
 * Tenancy::runAs(), so BelongsToCompany stamps the right `company_id`.
 *
 *  1. company@example.com and admin@healthcare.com: the five defaults (CompanySetupService —
 *     the same code that provisions a new company), so the demo company matches the Expense
 *     Categories screenshot exactly.
 *  2. Every other existing company that has no categories yet: the five defaults too (they were
 *     created before CompanySetupService provisioned categories). A company that already has
 *     categories is left alone.
 *  3. admin@healthcare.com also gets three of its own — one inactive, so the status filter and
 *     the Inactive badge can be exercised — making tenant isolation visible by hand (both
 *     companies have a "Travel"; only Healthcare has "Medical Supplies").
 *
 * Run: php artisan db:seed --class=ExpenseCategorySeeder
 */
class ExpenseCategorySeeder extends Seeder
{
    private const DEMO_COMPANIES = ['company@example.com', 'admin@healthcare.com'];

    /** @var array<string, list<array{name: string, description: string, color: string, status: string}>> */
    private const EXTRA = [
        'admin@healthcare.com' => [
            ['name' => 'Medical Supplies', 'description' => 'Consumables and clinical supplies', 'color' => '#10B77F', 'status' => 'active'],
            ['name' => 'Conferences', 'description' => 'Medical conferences and training', 'color' => '#8B5CF6', 'status' => 'active'],
            ['name' => 'Lab Equipment', 'description' => 'Laboratory equipment purchases', 'color' => '#F59E0B', 'status' => 'inactive'],
        ],
    ];

    public function run(CompanySetupService $setup): void
    {
        $tenancy = Tenancy::instance();

        foreach (Company::query()->orderBy('id')->get() as $company) {
            $isDemo = in_array($company->email, self::DEMO_COMPANIES, true);
            $hasAny = $tenancy->runAs($company, fn (): bool => ExpenseCategory::withTrashed()->exists());

            if (! $isDemo && $hasAny) {
                $this->command?->line(sprintf('  %-28s has categories — left alone', $company->email));

                continue;
            }

            $defaults = $setup->seedExpenseCategories($company);
            $extras = $this->seedExtras($company, self::EXTRA[$company->email] ?? []);

            $this->command?->info(sprintf(
                '  %-28s defaults: %d new%s',
                $company->email,
                $defaults,
                isset(self::EXTRA[$company->email]) ? sprintf(' · own: %d (%d new)', count(self::EXTRA[$company->email]), $extras) : '',
            ));
        }
    }

    /**
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
                // withTrashed: a soft-deleted demo category is restored, not duplicated.
                $category = ExpenseCategory::withTrashed()->named($row['name'])->first() ?? new ExpenseCategory;
                $created += $category->exists ? 0 : 1;

                $category->fill([
                    'name' => $row['name'],
                    'description' => $row['description'],
                    'color' => $row['color'],
                    'status' => ExpenseCategoryStatus::from($row['status']),
                ]);
                $category->deleted_at = null;
                $category->save();
            }

            return $created;
        });
    }
}
