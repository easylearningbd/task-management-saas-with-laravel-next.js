<?php

namespace Database\Factories;

use App\Enums\ProjectPriority;
use App\Enums\ProjectStatus;
use App\Models\Client;
use App\Models\Project;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

/**
 * Projects belong to the company in context (BelongsToCompany), so create them as a signed-in
 * company or inside a context — the client is then made in that same company:
 *
 *     Tenancy::instance()->runAs($company, fn () => Project::factory()->count(3)->create());
 *
 * @extends Factory<Project>
 */
class ProjectFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $start = Carbon::today()->subDays(fake()->numberBetween(0, 60));

        return [
            'client_id' => Client::factory(),
            'name' => fake()->unique()->catchPhrase(),
            'description' => fake()->sentence(),
            'start_date' => $start->toDateString(),
            'end_date' => $start->copy()->addDays(fake()->numberBetween(30, 180))->toDateString(),
            'budget' => number_format(fake()->numberBetween(1000, 900000), 2, '.', ''),
            'priority' => ProjectPriority::Medium,
            'status' => ProjectStatus::Active,
        ];
    }

    public function status(ProjectStatus $status): static
    {
        return $this->state(['status' => $status]);
    }
}
