<?php

namespace App\Http\Requests\Company;

use App\Enums\ExpenseCategoryStatus;
use App\Models\Project;
use App\Support\Tenancy\Tenancy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

/**
 * POST /api/v1/projects/{project}/expenses — the Add Expense modal: Title*, Description,
 * Amount* (≥ 0), Date*, Category* (one of this company's active expense categories). The project
 * comes from the route (the company's own, or 404).
 */
class StoreExpenseRequest extends FormRequest
{
    public const TITLE_MAX = 255;

    public const DESCRIPTION_MAX = 5000;

    public const AMOUNT_MAX = '9999999999999.99';

    public function authorize(): bool
    {
        $project = $this->route('project');

        return $project instanceof Project && $this->user()->can('update', $project);
    }

    protected function prepareForValidation(): void
    {
        $trimmed = [];
        foreach (['title', 'description', 'amount', 'expense_date'] as $field) {
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
            'title' => ['required', 'string', 'max:'.self::TITLE_MAX],
            'description' => ['nullable', 'string', 'max:'.self::DESCRIPTION_MAX],
            'amount' => ['required', 'numeric', 'decimal:0,2', 'min:0', 'max:'.self::AMOUNT_MAX],
            'expense_date' => ['required', 'date_format:Y-m-d'],
            'expense_category_id' => ['required', 'integer', $this->categoryRule()],
        ];
    }

    /** One of this company's active categories — another company's id is simply unknown. */
    protected function categoryRule(): Exists
    {
        return $this->companyCategories()->where('status', ExpenseCategoryStatus::Active->value);
    }

    /** This company's live (not deleted) expense categories. */
    protected function companyCategories(): Exists
    {
        return Rule::exists('expense_categories', 'id')
            ->where('company_id', Tenancy::instance()->requireCompanyId())
            ->whereNull('deleted_at');
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
            'amount.required' => __('The amount is required.'),
            'amount.numeric' => __('Enter the amount as a number.'),
            'amount.decimal' => __('The amount can have at most 2 decimal places.'),
            'amount.min' => __('The amount can\'t be negative.'),
            'amount.max' => __('The amount is too large.'),
            'expense_date.required' => __('The date is required.'),
            'expense_date.date_format' => __('Enter a valid date.'),
            'expense_category_id.required' => __('Select a category.'),
            'expense_category_id.integer' => __('Select a category.'),
            'expense_category_id.exists' => __('Select one of your active categories.'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function expenseData(): array
    {
        return $this->safe()->only(['title', 'description', 'amount', 'expense_date', 'expense_category_id']);
    }
}
