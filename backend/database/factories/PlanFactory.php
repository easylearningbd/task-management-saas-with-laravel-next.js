<?php

namespace Database\Factories;

use App\Models\Plan;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Plan>
 */
class PlanFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->words(2, true).' Plan',
            'description' => fake()->sentence(),
            'monthly_price' => '10.00',
            'yearly_price' => '96.00',
            'max_projects' => 10,
            'storage_limit_gb' => '2.00',
            'trial_enabled' => false,
            'trial_days' => 0,
            'ai_integration' => false,
            'is_active' => true,
            'is_default' => false,
            'is_recommended' => false,
            'sort_order' => 0,
        ];
    }

    public function default(): static
    {
        return $this->state(fn (array $attributes) => ['is_default' => true, 'is_active' => true]);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => ['is_active' => false]);
    }

    public function withTrial(int $days = 7): static
    {
        return $this->state(fn (array $attributes) => ['trial_enabled' => true, 'trial_days' => $days]);
    }
}
