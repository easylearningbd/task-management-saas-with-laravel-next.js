<?php

namespace Database\Factories;

use App\Enums\CouponType;
use App\Models\Coupon;
use App\Services\CouponService;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Coupon>
 */
class CouponFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => ucwords(fake()->unique()->words(2, true)).' Coupon',
            'code' => fake()->unique()->bothify('TEST-####??'),
            'type' => CouponType::Percentage,
            'value' => '10.00',
            'min_spend' => null,
            'max_spend' => null,
            'usage_limit' => null,
            'per_user_limit' => null,
            'expiry_date' => now()->addMonth()->toDateString(),
            'is_active' => true,
        ];
    }

    public function flat(string $value = '25.00'): static
    {
        return $this->state(fn (array $attributes) => ['type' => CouponType::Flat, 'value' => $value]);
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => ['is_active' => false]);
    }

    /** Already expired — only reachable through the factory, never through the service. */
    public function expired(): static
    {
        return $this->state(fn (array $attributes) => ['expiry_date' => now()->subDays(10)->toDateString()]);
    }

    /** A code in the Auto Generate format. */
    public function generatedCode(): static
    {
        return $this->state(fn (array $attributes) => ['code' => CouponService::randomCode()]);
    }
}
