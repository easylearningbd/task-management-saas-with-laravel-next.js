<?php

namespace Database\Factories;

use App\Models\Project;
use App\Models\ProjectNote;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Create through a project of the company in context; pass `created_by` for the author:
 *
 *     Tenancy::instance()->runAs($company, fn () => ProjectNote::factory()->for($project)->create(['created_by' => $company->id]));
 *
 * @extends Factory<ProjectNote>
 */
class ProjectNoteFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'project_id' => Project::factory(),
            'title' => fake()->sentence(4),
            'content' => fake()->paragraph(),
            'created_by' => null,
        ];
    }
}
