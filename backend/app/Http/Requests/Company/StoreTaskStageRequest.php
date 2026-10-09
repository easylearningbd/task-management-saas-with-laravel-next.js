<?php

namespace App\Http\Requests\Company;

use App\Enums\TaskStageStatus;
use App\Models\TaskStage;
use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * POST /api/v1/task-stages — the Add New Task Stage form (PRD §6.13): Stage Name*, Description,
 * Color*, Order, Status, Mark as Done Stage. `company_id` is never read from the request:
 * BelongsToCompany sets it. The same rules and wording live in the frontend schema
 * (features/task-stages/schema.ts, messages/en.json → taskStages.validation).
 *
 * Validation only covers the fields; the workflow rules (one done stage, a done stage is
 * active, contiguous order) are TaskStageService's, and come back as 422s under `stage`.
 * An empty Order means "at the end"; one past the end means the same.
 *
 * The name is unique within the company, ignoring case, among stages that are not deleted. A
 * deleted stage's name may be used again: the service restores that row (Phase 0 decision 5).
 */
class StoreTaskStageRequest extends FormRequest
{
    public const NAME_MAX = 255;

    public const DESCRIPTION_MAX = 1000;

    /** Far beyond any real workflow; anything past the end is placed last anyway. */
    public const ORDER_MAX = 10000;

    /** `#RRGGBB` — stored uppercase by the model. */
    public const COLOR_PATTERN = '/^#[0-9A-Fa-f]{6}$/';

    public function authorize(): bool
    {
        return $this->user()->can('create', TaskStage::class);
    }

    protected function prepareForValidation(): void
    {
        $trimmed = [];
        foreach (['name', 'description', 'color', 'order'] as $field) {
            if (is_string($this->input($field))) {
                $trimmed[$field] = trim($this->input($field));
            }
        }
        // An emptied optional field is "no value".
        foreach (['description', 'order'] as $field) {
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
            'name' => ['required', 'string', 'max:'.self::NAME_MAX, $this->uniqueName()],
            'description' => ['nullable', 'string', 'max:'.self::DESCRIPTION_MAX],
            'color' => ['required', 'string', 'regex:'.self::COLOR_PATTERN],
            'order' => ['nullable', 'integer', 'min:1', 'max:'.self::ORDER_MAX],
            'status' => ['sometimes', Rule::enum(TaskStageStatus::class)],
            'is_done_stage' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * No other live stage of this company has this name, in any case. The query is the
     * company's own (BelongsToCompany), so another company's "To Do" never counts.
     */
    protected function uniqueName(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            if (! is_string($value) || $value === '') {
                return;
            }

            if ($this->nameQuery($value)->exists()) {
                $fail(__('A task stage with this name already exists.'));
            }
        };
    }

    /**
     * @return Builder<TaskStage>
     */
    protected function nameQuery(string $name): Builder
    {
        return TaskStage::query()->named($name);
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => __('The stage name is required.'),
            'name.max' => __('The stage name may not be longer than :max characters.'),
            'description.max' => __('The description may not be longer than :max characters.'),
            'color.required' => __('The color is required.'),
            'color.regex' => __('Enter a color as a hex code, like #3B82F6.'),
            'order.integer' => __('The order must be a whole number.'),
            'order.min' => __('The order must be at least :min.'),
            'order.max' => __('The order may not be greater than :max.'),
        ];
    }

    /**
     * Only the form's fields — anything else in the body (company_id, id, …) is dropped. `order`
     * and `is_done_stage` are included only when sent, so an update can leave them alone.
     *
     * @return array<string, mixed>
     */
    public function stageData(): array
    {
        return $this->safe()->only(['name', 'description', 'color', 'order', 'status', 'is_done_stage']);
    }
}
