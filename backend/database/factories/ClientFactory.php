<?php

namespace Database\Factories;

use App\Enums\ClientStatus;
use App\Models\Client;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Clients belong to the company in context (BelongsToCompany), so create them as a signed-in
 * company or inside a context:
 *
 *     Tenancy::instance()->runAs($company, fn () => Client::factory()->count(3)->create());
 *
 * @extends Factory<Client>
 */
class ClientFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $company = fake()->company();

        return [
            'name' => fake()->name(),
            'email' => fake()->unique()->safeEmail(),
            'phone' => fake()->numerify('+1-###-###-####'),
            'company_name' => $company,
            'address' => fake()->streetAddress().', '.fake()->city().', '.fake()->stateAbbr().' '.fake()->postcode(),
            'website' => 'https://'.fake()->domainName(),
            'status' => ClientStatus::Active,
            'notes' => null,
        ];
    }

    public function inactive(): static
    {
        return $this->state(['status' => ClientStatus::Inactive]);
    }
}
