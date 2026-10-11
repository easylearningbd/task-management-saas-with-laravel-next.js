<?php

namespace App\Http\Requests\Company;

use App\Models\Task;
use Illuminate\Foundation\Http\FormRequest;

/**
 * PATCH /api/v1/tasks/{task}/move — the drag endpoint: the destination stage and the 1-based
 * position in its column. No exists rule on purpose: TaskService looks the stage up in the
 * company's scope, so another company's stage is a 404 (not a 422 that would confirm it exists);
 * an inactive stage is a 422 there.
 */
class MoveTaskRequest extends FormRequest
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
            'task_stage_id' => ['required', 'integer', 'min:1'],
            'position' => ['required', 'integer', 'min:1'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'task_stage_id.required' => __('Choose a stage.'),
            'position.required' => __('Choose a position.'),
            'position.min' => __('Positions start at 1.'),
        ];
    }

    public function stageId(): int
    {
        return (int) $this->validated('task_stage_id');
    }

    public function position(): int
    {
        return (int) $this->validated('position');
    }
}
