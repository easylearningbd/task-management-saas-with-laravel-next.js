<?php

namespace App\Http\Requests\Company;

use App\Models\TaskStage;
use Illuminate\Foundation\Http\FormRequest;

/**
 * PATCH /api/v1/task-stages/reorder — `{ "ids": [4, 1, 2, 3] }`: every one of the company's
 * stages, once each, in the new order. The shape is checked here; that the list is exactly the
 * company's own stages (no partial list, no unknown or foreign id) is checked by
 * TaskStageService::reorder() inside its transaction, against the company's scoped stages — so
 * another company's id is simply "not one of yours", and nothing of theirs is touched.
 */
class ReorderTaskStagesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('reorder', TaskStage::class);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'ids' => ['required', 'array', 'min:1', 'max:1000'],
            'ids.*' => ['required', 'integer', 'min:1', 'distinct'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'ids.required' => __('Send every one of your stages exactly once, in the new order.'),
            'ids.*.distinct' => __('Send every one of your stages exactly once, in the new order.'),
        ];
    }

    /**
     * @return list<int>
     */
    public function ids(): array
    {
        return array_map('intval', array_values($this->validated('ids')));
    }
}
