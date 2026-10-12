<?php

namespace Database\Factories;

use App\Models\Tax;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Create in the company's context:
 *
 *     Tenancy::instance()->runAs($company, fn () => Tax::factory()->create(['rate' => '10.00']));
 *
 * @extends Factory<Tax>
 */
class TaxFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => ucfirst(fake()->unique()->word()).' Tax',
            'rate' => number_format(fake()->numberBetween(1, 25), 2, '.', ''),
            'is_active' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn () => ['is_active' => false]);
    }
}
