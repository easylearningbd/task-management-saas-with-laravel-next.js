<?php

namespace Database\Factories;

use App\Enums\MilestoneStatus;
use App\Models\Milestone;
use App\Models\Project;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

/**
 * Milestones belong to a project of the company in context. Prefer creating them through the
 * project, so they share its company:
 *
 *     Tenancy::instance()->runAs($company, fn () => Milestone::factory()->for($project)->create());
 *
 * @extends Factory<Milestone>
 */
class MilestoneFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'title' => ucfirst(fake()->words(2, true)),
            'description' => fake()->sentence(),
            'start_date' => null,
            'due_date' => Carbon::today()->addDays(fake()->numberBetween(5, 90))->toDateString(),
            'progress' => fake()->numberBetween(0, 100),
            'status' => MilestoneStatus::InProgress,
        ];
    }

    public function completed(): static
    {
        return $this->state(['status' => MilestoneStatus::Completed, 'progress' => 100]);
    }
}
