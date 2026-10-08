<?php

namespace App\Http\Requests\Company;

use App\Models\ExpenseCategory;
use Closure;
use Illuminate\Database\Eloquent\Builder;

/**
 * PUT /api/v1/expense-categories/{category} — the Edit Expense Category form: the same rules as
 * Add, with the name check ignoring the category being edited (renaming "Travel" to "TRAVEL"
 * is fine). The route-bound category is already limited to the current company
 * (BelongsToCompany); the policy checks ownership again.
 *
 * Unlike Add, an edit cannot take a deleted category's name: there is no row to restore into,
 * and the (company_id, name) index still holds it — so it is a 422, not a database error.
 */
class UpdateExpenseCategoryRequest extends StoreExpenseCategoryRequest
{
    public function authorize(): bool
    {
        $category = $this->route('category');

        return $category instanceof ExpenseCategory && $this->user()->can('update', $category);
    }

    protected function uniqueName(): Closure
    {
        $live = parent::uniqueName();

        return function (string $attribute, mixed $value, Closure $fail) use ($live): void {
            $failed = false;
            $live($attribute, $value, function (string $message) use ($fail, &$failed) {
                $failed = true;
                $fail($message);
            });

            if (! $failed && is_string($value) && $value !== ''
                && ExpenseCategory::onlyTrashed()->named($value)->exists()) {
                $fail(__('A deleted category uses this name. Add it as a new category to restore it.'));
            }
        };
    }

    /**
     * @return Builder<ExpenseCategory>
     */
    protected function nameQuery(string $name): Builder
    {
        /** @var ExpenseCategory $category */
        $category = $this->route('category');

        return parent::nameQuery($name)->whereKeyNot($category->getKey());
    }
}
