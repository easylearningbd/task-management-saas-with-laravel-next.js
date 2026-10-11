<?php

namespace App\Http\Requests\Company;

use App\Enums\TaskStageStatus;
use App\Models\Task;
use Illuminate\Database\Query\Builder;
use Illuminate\Validation\Rules\Exists;

/**
 * PUT /api/v1/tasks/{task} — the Edit Task modal: the same fields and rules as create, except that
 * the task's current stage stays acceptable even if it was deactivated since (any other stage
 * must be active). Changing the stage here puts the task at the end of the new column.
 */
class UpdateTaskRequest extends StoreTaskRequest
{
    public function authorize(): bool
    {
        $task = $this->route('task');

        return $task instanceof Task && $this->user()->can('update', $task);
    }

    protected function stageRule(): Exists
    {
        /** @var Task $task */
        $task = $this->route('task');
        $current = $task->task_stage_id;

        // (status = active OR id = the current stage), within the company's live stages.
        return $this->companyRows('task_stages')->where(fn (Builder $q) => $q
            ->where('status', TaskStageStatus::Active->value)
            ->orWhere('id', $current));
    }
}
