<?php

namespace App\Services;

use App\Models\Task;
use App\Models\TaskChecklistItem;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * A task's checklist (the Checklist tab). Items are created under the company's own task (route
 * bound), keep a contiguous `position` from 1, and are independent of the task's progress
 * (business rule 9: ticking items never changes it). Writes that renumber lock the task row
 * (MySQL; a no-op on SQLite).
 */
class TaskChecklistService
{
    public const ERROR_KEY = 'ids';

    /**
     * @return Collection<int, TaskChecklistItem>
     */
    public function forTask(Task $task): Collection
    {
        return $task->checklistItems()->orderBy('task_checklist_items.id')->get();
    }

    /**
     * @param  array<string, mixed>  $data  validated title (and optionally is_completed)
     */
    public function create(Task $task, array $data): TaskChecklistItem
    {
        return DB::transaction(function () use ($task, $data): TaskChecklistItem {
            $this->lock($task);
            $item = $task->checklistItems()->make($data);
            $item->forceFill(['position' => (int) $task->checklistItems()->max('task_checklist_items.position') + 1])->save();

            return $item;
        });
    }

    /**
     * @param  array<string, mixed>  $data  validated title and/or is_completed
     */
    public function update(TaskChecklistItem $item, array $data): TaskChecklistItem
    {
        $item->fill($data)->save();

        return $item;
    }

    /** Removes the item; the rest close up. */
    public function delete(TaskChecklistItem $item): void
    {
        DB::transaction(function () use ($item): void {
            $task = $item->task;
            $this->lock($task);
            $item->delete();
            $this->writeSequence($task->checklistItems()->orderBy('task_checklist_items.id')->pluck('task_checklist_items.id')->all());
        });
    }

    /**
     * The new order: exactly this task's item ids, each once (anything else is a 422 — a stale
     * list must not drop or duplicate items).
     *
     * @param  list<int>  $ids
     * @return Collection<int, TaskChecklistItem>
     */
    public function reorder(Task $task, array $ids): Collection
    {
        return DB::transaction(function () use ($task, $ids): Collection {
            $this->lock($task);
            $current = $task->checklistItems()->pluck('task_checklist_items.id')->map(fn ($id) => (int) $id)->sort()->values()->all();
            $given = collect($ids)->map(fn ($id) => (int) $id);
            if ($given->duplicates()->isNotEmpty() || $given->sort()->values()->all() !== $current) {
                throw ValidationException::withMessages([self::ERROR_KEY => __('The checklist changed meanwhile. Reload it and try again.')]);
            }
            $this->writeSequence($given->all());

            return $this->forTask($task);
        });
    }

    /**
     * @param  list<int>  $ids
     */
    private function writeSequence(array $ids): void
    {
        foreach (array_values($ids) as $index => $id) {
            TaskChecklistItem::query()->whereKey($id)->where('task_checklist_items.position', '!=', $index + 1)->toBase()->update(['position' => $index + 1]);
        }
    }

    private function lock(Task $task): void
    {
        Task::query()->whereKey($task->getKey())->lockForUpdate()->first(['tasks.id']);
    }
}
