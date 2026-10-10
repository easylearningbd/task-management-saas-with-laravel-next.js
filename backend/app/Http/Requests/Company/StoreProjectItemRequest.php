<?php

namespace App\Http\Requests\Company;

use App\Enums\ProjectItemStatus;
use App\Enums\ProjectItemUnit;
use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * POST /api/v1/projects/{project}/items — the Add Item modal: Item Name*, Description,
 * Default Price* (≥ 0), Unit* (hours, package, piece, day, month, fixed), Status (Active).
 */
class StoreProjectItemRequest extends FormRequest
{
    public const NAME_MAX = 255;

    public const DESCRIPTION_MAX = 5000;

    public const PRICE_MAX = '9999999999999.99';

    public function authorize(): bool
    {
        $project = $this->route('project');

        return $project instanceof Project && $this->user()->can('update', $project);
    }

    protected function prepareForValidation(): void
    {
        $trimmed = [];
        foreach (['name', 'description', 'default_price'] as $field) {
            if (is_string($this->input($field))) {
                $trimmed[$field] = trim($this->input($field));
            }
        }
        if (($trimmed['description'] ?? null) === '') {
            $trimmed['description'] = null;
        }

        $this->merge($trimmed);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:'.self::NAME_MAX],
            'description' => ['nullable', 'string', 'max:'.self::DESCRIPTION_MAX],
            'default_price' => ['required', 'numeric', 'decimal:0,2', 'min:0', 'max:'.self::PRICE_MAX],
            'unit' => ['required', Rule::enum(ProjectItemUnit::class)],
            'status' => ['sometimes', Rule::enum(ProjectItemStatus::class)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => __('The item name is required.'),
            'name.max' => __('The item name may not be longer than :max characters.'),
            'description.max' => __('The description may not be longer than :max characters.'),
            'default_price.required' => __('The default price is required.'),
            'default_price.numeric' => __('Enter the price as a number.'),
            'default_price.decimal' => __('The price can have at most 2 decimal places.'),
            'default_price.min' => __('The price can\'t be negative.'),
            'default_price.max' => __('The price is too large.'),
            'unit.required' => __('Select a unit.'),
            'unit.enum' => __('Select a unit.'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function itemData(): array
    {
        return $this->safe()->only(['name', 'description', 'default_price', 'unit', 'status']);
    }
}
