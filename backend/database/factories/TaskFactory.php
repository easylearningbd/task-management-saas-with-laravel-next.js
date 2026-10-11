<?php

namespace Database\Factories;

use App\Enums\TaskPriority;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskStage;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Carbon;

/**
 * Tasks belong to the company in context (BelongsToCompany) — create them inside a context, with
 * the company's own project and stage:
 *
 *     Tenancy::instance()->runAs($company, fn () => Task::factory()->for($project)->for($stage, 'stage')->create());
 *
 * Unless given, `position` is the next free one in its column (so a column stays contiguous), and
 * `completed_at` follows the stage (set in a done stage). Business rules are TaskService's; the
 * factory only makes valid rows.
 *
 * @extends Factory<Task>
 */
class TaskFactory extends Factory
{
    private const UNPLACED = 0;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        // Never overdue by accident: the due date is always after today (see overdue() for late ones).
        $start = Carbon::today()->subDays(fake()->numberBetween(0, 30));

        return [
            'project_id' => Project::factory(),
            'milestone_id' => null,
            'task_stage_id' => TaskStage::factory(),
            'title' => ucfirst(fake()->words(3, true)),
            'description' => fake()->sentence(),
            'start_date' => $start->toDateString(),
            'due_date' => Carbon::today()->addDays(fake()->numberBetween(1, 60))->toDateString(),
            'priority' => TaskPriority::Medium,
            'progress' => fake()->numberBetween(0, 90),
            'position' => self::UNPLACED,
            'completed_at' => null,
            'created_by' => null,
        ];
    }

    public function configure(): static
    {
        return $this->afterCreating(function (Task $task): void {
            $changes = [];
            if ($task->position === self::UNPLACED) {
                $changes['position'] = (int) Task::query()->where('task_stage_id', $task->task_stage_id)->whereKeyNot($task->getKey())->max('position') + 1;
            }
            if ($task->stage?->is_done_stage && $task->completed_at === null) {
                $changes += ['completed_at' => Carbon::now(), 'progress' => 100];
            }
            if ($changes !== []) {
                $task->forceFill($changes)->saveQuietly();
            }
        });
    }

    public function overdue(): static
    {
        return $this->state([
            'start_date' => Carbon::today()->subDays(20)->toDateString(),
            'due_date' => Carbon::today()->subDays(3)->toDateString(),
        ]);
    }

    public function priority(TaskPriority $priority): static
    {
        return $this->state(['priority' => $priority]);
    }
}
