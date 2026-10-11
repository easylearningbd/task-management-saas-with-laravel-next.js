<?php

namespace Database\Factories;

use App\Models\Task;
use App\Models\TaskChecklistItem;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * Checklist items belong to a task of the company in context:
 *
 *     Tenancy::instance()->runAs($company, fn () => TaskChecklistItem::factory()->for($task)->count(3)->create());
 *
 * Unless given, `position` is the next free one within the task.
 *
 * @extends Factory<TaskChecklistItem>
 */
class TaskChecklistItemFactory extends Factory
{
    private const UNPLACED = 0;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'task_id' => Task::factory(),
            'title' => ucfirst(fake()->words(3, true)),
            'is_completed' => false,
            'position' => self::UNPLACED,
        ];
    }

    public function configure(): static
    {
        return $this->afterCreating(function (TaskChecklistItem $item): void {
            if ($item->position === self::UNPLACED) {
                $item->forceFill(['position' => (int) TaskChecklistItem::query()->where('task_id', $item->task_id)->whereKeyNot($item->getKey())->max('position') + 1])->saveQuietly();
            }
        });
    }

    public function completed(): static
    {
        return $this->state(['is_completed' => true]);
    }
}
