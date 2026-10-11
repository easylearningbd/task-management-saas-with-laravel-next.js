<?php

namespace App\Http\Requests\Company;

use App\Models\Task;
use Illuminate\Foundation\Http\FormRequest;

/**
 * POST /api/v1/tasks/{task}/checklist-items — an item under the company's own task (route bound):
 * title* (max 255), is_completed (optional, default false). Added at the end of the list.
 */
class StoreTaskChecklistItemRequest extends FormRequest
{
    public const TITLE_MAX = 255;

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
            'title' => ['required', 'string', 'max:'.self::TITLE_MAX],
            'is_completed' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'title.required' => __('The item is required.'),
            'title.max' => __('The item may not be longer than :max characters.'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function itemData(): array
    {
        return $this->safe()->only(['title', 'is_completed']);
    }
}
