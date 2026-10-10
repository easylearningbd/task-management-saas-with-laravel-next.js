<?php

namespace App\Services;

use App\Models\Expense;
use App\Models\Project;
use Illuminate\Database\Eloquent\Collection;

/**
 * Project expenses (the Expenses tab; later also Financial ▸ Expenses). Always reached through
 * the company's own (route-bound) project; the category is validated by the requests against the
 * company's active categories. Totals are summed with bcmath on the decimal strings — never as
 * floats (SQLite would return a float from SUM()).
 */
class ExpenseService
{
    /**
     * Most recent first, with each category (name and colour).
     *
     * @return Collection<int, Expense>
     */
    public function forProject(Project $project): Collection
    {
        return $project->expenses()->with('category')->orderByDesc('expenses.expense_date')->orderByDesc('expenses.id')->get();
    }

    /**
     * @param  array<string, mixed>  $data  validated expense_category_id, title, description, amount, expense_date
     */
    public function create(Project $project, array $data): Expense
    {
        /** @var Expense $expense */
        $expense = $project->expenses()->create($data);

        return $expense->load('category');
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Expense $expense, array $data): Expense
    {
        $expense->update($data);

        return $expense->load('category');
    }

    /** Soft delete. */
    public function delete(Expense $expense): void
    {
        $expense->delete();
    }

    /** The project's spending: the exact sum of its live expenses ("6221.00"). */
    public function totalFor(Project $project): string
    {
        return $project->expenses()->pluck('amount')->reduce(
            fn (string $sum, $amount) => bcadd($sum, (string) $amount, 2),
            '0.00',
        );
    }

    /**
     * The two stat cards above the Expenses list.
     *
     * @return array{count: int, total: string}
     */
    public function stats(Project $project): array
    {
        return [
            'count' => $project->expenses()->count(),
            'total' => $this->totalFor($project),
        ];
    }
}
