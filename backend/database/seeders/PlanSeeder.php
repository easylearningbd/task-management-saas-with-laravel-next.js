<?php

namespace Database\Seeders;

use App\Models\Plan;
use App\Services\PlanService;
use Illuminate\Database\Seeder;

/**
 * Seeds the three plans from CLAUDE.md §13: Free (default), Starter, Pro (recommended).
 *
 * Idempotent and additive: matches on name (soft-deleted rows included, so nothing is
 * duplicated), never truncates or deletes, and saves a row only when a value differs — a
 * second run writes nothing. Free becomes the default only if no default plan exists, so a
 * re-run never takes the default away from a plan an admin chose later.
 *
 * Run: php artisan db:seed --class=PlanSeeder
 */
class PlanSeeder extends Seeder
{
    /** @var list<array<string, mixed>> */
    private const PLANS = [
        [
            'name' => 'Free',
            'description' => 'Basic plan for small businesses just getting started.',
            'monthly_price' => '0.00',
            'yearly_price' => '0.00',
            'max_projects' => 3,
            'storage_limit_gb' => '1.00',
            'trial_enabled' => false,
            'trial_days' => 0,
            'ai_integration' => false,
            'is_active' => true,
            'is_recommended' => false,
            'sort_order' => 1,
        ],
        [
            'name' => 'Starter',
            'description' => 'Perfect for small businesses looking to grow their online presence.',
            'monthly_price' => '19.99',
            'yearly_price' => '191.90',
            'max_projects' => 25,
            'storage_limit_gb' => '5.00',
            'trial_enabled' => true,
            'trial_days' => 7,
            'ai_integration' => false,
            'is_active' => true,
            'is_recommended' => false,
            'sort_order' => 2,
        ],
        [
            'name' => 'Pro',
            'description' => 'Ideal for growing businesses with multiple stores and advanced needs.',
            'monthly_price' => '49.99',
            'yearly_price' => '479.90',
            'max_projects' => Plan::UNLIMITED,
            'storage_limit_gb' => '50.00',
            'trial_enabled' => true,
            'trial_days' => 14,
            'ai_integration' => true,
            'is_active' => true,
            'is_recommended' => true,
            'sort_order' => 3,
        ],
    ];

    public function run(PlanService $plans): void
    {
        foreach (self::PLANS as $attributes) {
            $plan = Plan::withTrashed()->firstOrNew(['name' => $attributes['name']]);
            $plan->forceFill($attributes + ['deleted_at' => null]);

            $action = match (true) {
                ! $plan->exists => 'created',
                $plan->isDirty() => 'updated',
                default => 'unchanged',
            };
            if ($action !== 'unchanged') {
                $plan->save();
            }

            $this->command?->line(sprintf('  %-8s %s', $plan->name, $action));
        }

        if (! Plan::where('is_default', true)->exists()) {
            $plans->setDefault(Plan::where('name', 'Free')->firstOrFail());
            $this->command?->line('  Free     set as the default plan');
        }
    }
}
