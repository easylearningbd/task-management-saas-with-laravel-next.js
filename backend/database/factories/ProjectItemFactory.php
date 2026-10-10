<?php

namespace Database\Factories;

use App\Enums\ProjectItemStatus;
use App\Enums\ProjectItemUnit;
use App\Models\Project;
use App\Models\ProjectItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Create through a project of the company in context:
 *
 *     Tenancy::instance()->runAs($company, fn () => ProjectItem::factory()->for($project)->create());
 *
 * @extends Factory<ProjectItem>
 */
class ProjectItemFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'name' => ucwords(fake()->words(2, true)),
            'description' => fake()->sentence(),
            'default_price' => number_format(fake()->numberBetween(100, 20000), 2, '.', ''),
            'unit' => fake()->randomElement(ProjectItemUnit::cases()),
            'status' => ProjectItemStatus::Active,
        ];
    }
}
