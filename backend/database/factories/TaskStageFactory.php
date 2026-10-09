<?php

namespace Database\Factories;

use App\Enums\TaskStageStatus;
use App\Models\TaskStage;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * Task stages belong to the company in context (BelongsToCompany), so create them as a
 * signed-in company or inside a context:
 *
 *     Tenancy::instance()->runAs($company, fn () => TaskStage::factory()->count(3)->create());
 *
 * Each new stage goes after the company's last one, so a factory-made sequence is contiguous
 * (1..n) like a real one. A factory stage is never the done stage unless asked (`done()`); the
 * factory does not move the flag — use TaskStageService for that.
 *
 * @extends Factory<TaskStage>
 */
class TaskStageFactory extends Factory
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
            // Placed after the company's last stage once created (see configure()): a batch from
            // count(n) is built before any of it is saved, so a max() here would repeat.
            'order' => self::UNPLACED,
            'is_done_stage' => false,
            'status' => TaskStageStatus::Active,
        ];
    }

    private const UNPLACED = 0;

    public function configure(): static
    {
        return $this->afterCreating(function (TaskStage $stage): void {
            if ($stage->order !== self::UNPLACED) {
                return; // an explicit order was given
            }
            $stage->forceFill(['order' => (int) TaskStage::query()->whereKeyNot($stage->getKey())->max('order') + 1])->saveQuietly();
        });
    }

    public function inactive(): static
    {
        return $this->state(['status' => TaskStageStatus::Inactive]);
    }

    public function done(): static
    {
        return $this->state(['is_done_stage' => true, 'status' => TaskStageStatus::Active]);
    }
}
