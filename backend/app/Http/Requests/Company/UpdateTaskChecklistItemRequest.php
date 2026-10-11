<?php

namespace App\Http\Requests\Company;

use App\Models\TaskChecklistItem;

/**
 * PUT /api/v1/task-checklist-items/{checklistItem} — rename and/or tick: each field optional
 * (the checkbox sends only `is_completed`), but a sent title can't be empty.
 */
class UpdateTaskChecklistItemRequest extends StoreTaskChecklistItemRequest
{
    public function authorize(): bool
    {
        $item = $this->route('checklistItem');

        return $item instanceof TaskChecklistItem && $this->user()->can('update', $item);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'title' => ['sometimes', 'required', 'string', 'max:'.self::TITLE_MAX],
            'is_completed' => ['sometimes', 'boolean'],
        ];
    }
}
