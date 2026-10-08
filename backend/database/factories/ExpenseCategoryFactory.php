<?php

namespace Database\Factories;

use App\Enums\ExpenseCategoryStatus;
use App\Models\ExpenseCategory;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * Expense categories belong to the company in context (BelongsToCompany), so create them as a
 * signed-in company or inside a context:
 *
 *     Tenancy::instance()->runAs($company, fn () => ExpenseCategory::factory()->count(3)->create());
 *
 * @extends Factory<ExpenseCategory>
 */
class ExpenseCategoryFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => Str::title(fake()->unique()->words(2, true)),
            'description' => fake()->sentence(),
            'color' => Str::upper(fake()->hexColor()),
            'status' => ExpenseCategoryStatus::Active,
        ];
    }

    public function inactive(): static
    {
        return $this->state(['status' => ExpenseCategoryStatus::Inactive]);
    }
}
