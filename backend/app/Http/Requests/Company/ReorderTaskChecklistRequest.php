<?php

namespace App\Http\Requests\Company;

use App\Models\Task;
use Illuminate\Foundation\Http\FormRequest;

/**
 * PATCH /api/v1/tasks/{task}/checklist-items/reorder — every item id of the task, in the new
 * order. TaskChecklistService checks it is exactly the task's items (422 otherwise).
 */
class ReorderTaskChecklistRequest extends FormRequest
{
    public function authorize(): bool
    {
        $task = $this->route('task');

        return $task instanceof Task && $this->user()->can('update', $task);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer', 'distinct'],
        ];
    }

    /**
     * @return list<int>
     */
    public function ids(): array
    {
        return array_map('intval', $this->validated('ids'));
    }
}
