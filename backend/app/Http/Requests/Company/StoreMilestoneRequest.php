<?php

namespace App\Http\Requests\Company;

use App\Enums\MilestoneStatus;
use App\Models\Milestone;
use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * POST /api/v1/projects/{project}/milestones — the Add Milestone form (the screenshot, Phase 0
 * decision 7): Title*, Description, Due Date*, Progress (0–100, empty = 0), Status (Pending).
 * `start_date` is accepted but optional (kept for later); when given, the due date can't be
 * before it. The project comes from the route (the company's own, or 404).
 */
class StoreMilestoneRequest extends FormRequest
{
    public const TITLE_MAX = 255;

    public const DESCRIPTION_MAX = 5000;

    public function authorize(): bool
    {
        $project = $this->route('project');

        return $project instanceof Project && $this->user()->can('update', $project);
    }

    protected function prepareForValidation(): void
    {
        $trimmed = [];
        foreach (['title', 'description', 'start_date', 'due_date', 'progress'] as $field) {
            if (is_string($this->input($field))) {
                $trimmed[$field] = trim($this->input($field));
            }
        }
        foreach (['description', 'start_date', 'progress'] as $field) {
            if (($trimmed[$field] ?? null) === '') {
                $trimmed[$field] = null;
            }
        }

        $this->merge($trimmed);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:'.self::TITLE_MAX],
            'description' => ['nullable', 'string', 'max:'.self::DESCRIPTION_MAX],
            'start_date' => ['nullable', 'date_format:Y-m-d'],
            'due_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'progress' => ['nullable', 'integer', 'min:0', 'max:100'],
            'status' => ['sometimes', Rule::enum(MilestoneStatus::class)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'title.required' => __('The title is required.'),
            'title.max' => __('The title may not be longer than :max characters.'),
            'description.max' => __('The description may not be longer than :max characters.'),
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
    public function milestoneData(): array
    {
        $data = $this->safe()->only(['title', 'description', 'start_date', 'due_date', 'progress', 'status']);
        if (array_key_exists('progress', $data) && $data['progress'] === null) {
            $data['progress'] = 0;
        }

        return $data;
    }
}
