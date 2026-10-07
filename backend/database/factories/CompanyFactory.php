<?php

namespace Database\Factories;

use App\Enums\PlanDuration;
use App\Enums\UserStatus;
use App\Enums\UserType;
use App\Models\Company;
use App\Models\Plan;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * @extends Factory<Company>
 */
class CompanyFactory extends Factory
{
    protected $model = Company::class;

    protected static ?string $password;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'name' => fake()->unique()->company(),
            'email' => fake()->unique()->companyEmail(),
            'email_verified_at' => now(),
            'password' => static::$password ??= Hash::make('password'),
            'remember_token' => Str::random(10),
            'type' => UserType::Company,
            'status' => UserStatus::Active,
            'is_login_enabled' => true,
        ];
    }

    public function inactive(): static
    {
        return $this->state(fn (array $attributes) => ['status' => UserStatus::Inactive]);
    }

    public function loginDisabled(): static
    {
        return $this->state(fn (array $attributes) => ['is_login_enabled' => false]);
    }

    /** On a plan, billed monthly or yearly from now. */
    public function onPlan(Plan $plan, PlanDuration $duration = PlanDuration::Monthly): static
    {
        return $this->state(fn (array $attributes) => [
            'plan_id' => $plan->id,
            'plan_duration' => $duration,
            'plan_expires_at' => $duration === PlanDuration::Yearly ? now()->addYear() : now()->addMonth(),
            'trial_ends_at' => null,
        ]);
    }
}
