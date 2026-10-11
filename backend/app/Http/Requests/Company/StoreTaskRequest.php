<?php

namespace App\Http\Requests\Company;

use App\Enums\TaskPriority;
use App\Enums\TaskStageStatus;
use App\Models\Task;
use App\Support\Tenancy\Tenancy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

/**
 * POST /api/v1/tasks — the Add New Task modal:
 *   title*        max 255
 *   description   optional, max 5000
 *   project_id*   one of this company's projects (live)
 *   milestone_id  optional; this company's milestone — and of THAT project (TaskService, 422)
 *   task_stage_id* one of this company's ACTIVE stages
 *   start_date*   Y-m-d · due_date* Y-m-d, not before the start
 *   priority      low | medium | high | urgent (default medium)
 *   progress      optional whole number 0–100 (default 0; 100 in a done stage)
 * `company_id`, `position`, `completed_at` and `created_by` are never taken from the body.
 */
class StoreTaskRequest extends FormRequest
{
    public const TITLE_MAX = 255;

    public const DESCRIPTION_MAX = 5000;

    public function authorize(): bool
    {
        return $this->user()->can('create', Task::class);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:'.self::TITLE_MAX],
            'description' => ['nullable', 'string', 'max:'.self::DESCRIPTION_MAX],
            'project_id' => ['required', 'integer', $this->companyRows('projects')],
            'milestone_id' => ['nullable', 'integer', $this->companyRows('milestones')],
            'task_stage_id' => ['required', 'integer', $this->stageRule()],
            'start_date' => ['required', 'date_format:Y-m-d'],
            'due_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'priority' => ['sometimes', Rule::enum(TaskPriority::class)],
            'progress' => ['nullable', 'integer', 'min:0', 'max:100'],
        ];
    }

    /** One of this company's active stages. */
    protected function stageRule(): Exists
    {
        return $this->companyRows('task_stages')->where('status', TaskStageStatus::Active->value);
    }

    /** A live (not deleted) row of this company in `$table`. */
    protected function companyRows(string $table): Exists
    {
        return Rule::exists($table, 'id')
            ->where('company_id', Tenancy::instance()->requireCompanyId())
            ->whereNull('deleted_at');
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'title.required' => __('The task title is required.'),
            'title.max' => __('The task title may not be longer than :max characters.'),
            'description.max' => __('The description may not be longer than :max characters.'),
            'project_id.required' => __('Select a project.'),
            'project_id.integer' => __('Select a project.'),
            'project_id.exists' => __('Select one of your projects.'),
            'milestone_id.integer' => __('Select a milestone of the selected project.'),
            'milestone_id.exists' => __('Select a milestone of the selected project.'),
            'task_stage_id.required' => __('Select a stage.'),
            'task_stage_id.integer' => __('Select a stage.'),
            'task_stage_id.exists' => __('Select one of your active stages.'),
            'start_date.required' => __('The start date is required.'),
            'start_date.date_format' => __('Enter a valid start date.'),
            'due_date.required' => __('The due date is required.'),
            'due_date.date_format' => __('Enter a valid due date.'),
            'due_date.after_or_equal' => __('The due date can\'t be before the start date.'),
            'progress.integer' => __('The progress must be a whole number.'),
            'progress.min' => __('The progress must be between 0 and 100.'),
            'progress.max' => __('The progress must be between 0 and 100.'),
        ];
    }

    /**
     * Only the form's fields; an empty progress is 0.
     *
     * @return array<string, mixed>
     */
    public function taskData(): array
    {
        $data = $this->safe()->only(['title', 'description', 'project_id', 'milestone_id', 'task_stage_id', 'start_date', 'due_date', 'priority', 'progress']);
        if (array_key_exists('progress', $data) && $data['progress'] === null) {
            $data['progress'] = 0;
        }

        return $data;
    }
}
