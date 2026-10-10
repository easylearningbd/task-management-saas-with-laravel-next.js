<?php

namespace Database\Factories;

use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Project;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

/**
 * Create through a project of the company in context (the category is made in that company too
 * unless one is given):
 *
 *     Tenancy::instance()->runAs($company, fn () => Expense::factory()->for($project)->create());
 *
 * @extends Factory<Expense>
 */
class ExpenseFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'expense_category_id' => ExpenseCategory::factory(),
            'title' => ucwords(fake()->words(2, true)),
            'description' => fake()->sentence(),
            'amount' => number_format(fake()->numberBetween(10, 2000), 2, '.', ''),
            'expense_date' => Carbon::today()->subDays(fake()->numberBetween(0, 120))->toDateString(),
        ];
    }
}
