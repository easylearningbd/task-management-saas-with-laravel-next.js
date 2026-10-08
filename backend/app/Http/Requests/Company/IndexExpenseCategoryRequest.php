<?php

namespace App\Http\Requests\Company;

use App\Enums\ExpenseCategoryStatus;
use App\Http\Requests\IndexRequest;
use App\Models\ExpenseCategory;
use Illuminate\Database\Query\Expression;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * GET /api/v1/expense-categories — search (name, description), status, sort (whitelist below;
 * anything else → 422 from IndexRequest), page, per_page (10, max 100).
 */
class IndexExpenseCategoryRequest extends IndexRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('viewAny', ExpenseCategory::class);
    }

    /**
     * `status` is an ENUM: cast to text so it sorts alphabetically on MySQL too.
     *
     * @return array<string, string|Expression>
     */
    public function sortable(): array
    {
        return [
            'name' => 'expense_categories.name',
            'status' => DB::raw('CAST(expense_categories.status AS CHAR)'),
            'created_at' => 'expense_categories.created_at',
        ];
    }

    /** Oldest first — the screenshot's Travel, Office Supplies, Software, Marketing, Meals. */
    public function defaultSort(): string
    {
        return 'created_at';
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    protected function filterRules(): array
    {
        return [
            'status' => ['nullable', Rule::enum(ExpenseCategoryStatus::class)],
        ];
    }

    /**
     * @return array{search: ?string, status: ?string}
     */
    public function filters(): array
    {
        return [
            'search' => $this->search(),
            'status' => $this->validated('status'),
        ];
    }
}
