<?php

namespace App\Http\Requests\Company;

use App\Enums\ExpenseCategoryStatus;
use App\Models\Expense;
use Illuminate\Database\Query\Builder;
use Illuminate\Validation\Rules\Exists;

/**
 * PUT /api/v1/expenses/{expense} — the same rules as Add Expense. The category may stay the
 * expense's current one even if it was deactivated since; a new one must be active.
 */
class UpdateExpenseRequest extends StoreExpenseRequest
{
    public function authorize(): bool
    {
        $expense = $this->route('expense');

        return $expense instanceof Expense && $this->user()->can('update', $expense);
    }

    protected function categoryRule(): Exists
    {
        /** @var Expense $expense */
        $expense = $this->route('expense');
        $current = $expense->expense_category_id;

        return $this->companyCategories()->where(fn (Builder $q) => $q
            ->where('status', ExpenseCategoryStatus::Active->value)
            ->orWhere('id', $current));
    }
}
