<?php

namespace App\Services;

use App\Enums\ExpenseCategoryStatus;
use App\Models\ExpenseCategory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Expense category business logic (PRD §6.14). Every method works on the current company's
 * categories only: the model's BelongsToCompany scope and creating hook do the tenancy —
 * nothing here takes or sets a `company_id`.
 */
class ExpenseCategoryService
{
    /**
     * The list query: search (name, description) and the status filter.
     *
     * @param  array{search?: ?string, status?: ?string}  $filters
     * @return Builder<ExpenseCategory>
     */
    public function query(array $filters): Builder
    {
        return ExpenseCategory::query()
            ->search($filters['search'] ?? null)
            ->ofStatus($filters['status'] ?? null);
    }

    /**
     * A new category — or, when the company once had a category of this name and deleted it,
     * that row brought back with the new values (Phase 0 decision 3a). The (company_id, name)
     * unique index covers deleted rows, so a plain insert would collide; restoring keeps the
     * name usable again without a hard delete.
     *
     * @param  array<string, mixed>  $data  validated name, description, color, status
     */
    public function create(array $data): ExpenseCategory
    {
        return DB::transaction(function () use ($data): ExpenseCategory {
            $values = [
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'color' => $data['color'],
                'status' => $data['status'] ?? ExpenseCategoryStatus::Active,
            ];

            $deleted = ExpenseCategory::onlyTrashed()->named($data['name'])->lockForUpdate()->first();
            if ($deleted) {
                $deleted->fill($values);
                $deleted->created_at = $deleted->freshTimestamp(); // it is "added" again, now
                $deleted->restore(); // clears deleted_at and saves the new values

                return $deleted;
            }

            return ExpenseCategory::create($values);
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(ExpenseCategory $category, array $data): ExpenseCategory
    {
        $category->update($data);

        return $category;
    }

    /** Active ↔ Inactive. */
    public function toggleStatus(ExpenseCategory $category): ExpenseCategory
    {
        $category->status = $category->status->toggled();
        $category->save();

        return $category;
    }

    /** Soft delete. */
    public function delete(ExpenseCategory $category): void
    {
        $this->ensureDeletable($category);

        $category->delete();
    }

    /**
     * PRD §6.14: "a category in use cannot be deleted — deactivate instead". In use = filed under
     * by at least one live expense (a deleted expense no longer holds it).
     */
    private function ensureDeletable(ExpenseCategory $category): void
    {
        if ($category->expenses()->exists()) {
            throw ValidationException::withMessages([
                'category' => __('This category is used by expenses. Deactivate it instead.'),
            ]);
        }
    }
}
