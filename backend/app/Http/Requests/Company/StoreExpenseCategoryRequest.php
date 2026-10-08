<?php

namespace App\Http\Requests\Company;

use App\Enums\ExpenseCategoryStatus;
use App\Models\ExpenseCategory;
use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * POST /api/v1/expense-categories — the Add New Expense Category form (PRD §6.14): Category
 * Name*, Status, Description, Color*. `company_id` is never read from the request:
 * BelongsToCompany sets it. The same rules and wording live in the frontend schema
 * (features/expense-categories/schema.ts, messages/en.json → expenseCategories.validation).
 *
 * The name is unique within the company, ignoring case ("travel" = "Travel"), among categories
 * that are not deleted. A deleted category's name may be used again: the service restores that
 * row instead of inserting (Phase 0 decision 3a).
 */
class StoreExpenseCategoryRequest extends FormRequest
{
    public const NAME_MAX = 255;

    public const DESCRIPTION_MAX = 1000;

    /** `#RRGGBB` — stored uppercase by the model. */
    public const COLOR_PATTERN = '/^#[0-9A-Fa-f]{6}$/';

    public function authorize(): bool
    {
        return $this->user()->can('create', ExpenseCategory::class);
    }

    protected function prepareForValidation(): void
    {
        $trimmed = [];
        foreach (['name', 'description', 'color'] as $field) {
            if (is_string($this->input($field))) {
                $trimmed[$field] = trim($this->input($field));
            }
        }
        // An emptied description is "no description".
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
            'name' => ['required', 'string', 'max:'.self::NAME_MAX, $this->uniqueName()],
            'description' => ['nullable', 'string', 'max:'.self::DESCRIPTION_MAX],
            'color' => ['required', 'string', 'regex:'.self::COLOR_PATTERN],
            'status' => ['sometimes', Rule::enum(ExpenseCategoryStatus::class)],
        ];
    }

    /**
     * No other live category of this company has this name, in any case. The query is the
     * company's own (BelongsToCompany), so another company's "Travel" never counts.
     */
    protected function uniqueName(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            if (! is_string($value) || $value === '') {
                return;
            }

            if ($this->nameQuery($value)->exists()) {
                $fail(__('An expense category with this name already exists.'));
            }
        };
    }

    /**
     * @return Builder<ExpenseCategory>
     */
    protected function nameQuery(string $name): Builder
    {
        return ExpenseCategory::query()->named($name);
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => __('The category name is required.'),
            'name.max' => __('The category name may not be longer than :max characters.'),
            'description.max' => __('The description may not be longer than :max characters.'),
            'color.required' => __('The color is required.'),
            'color.regex' => __('Enter a color as a hex code, like #3B82F6.'),
        ];
    }

    /**
     * Only the form's fields — anything else in the body (company_id, id, …) is dropped.
     *
     * @return array<string, mixed>
     */
    public function categoryData(): array
    {
        return $this->safe()->only(['name', 'description', 'color', 'status']);
    }
}
