<?php

namespace App\Policies;

use App\Models\ExpenseCategory;
use App\Models\User;

/**
 * Belt and braces on top of BelongsToCompany: only a company works with expense categories, and
 * only with its own. (The global scope already makes another company's category unresolvable
 * — 404 — so `owns()` is the second line, not the first.)
 */
class ExpenseCategoryPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isCompany();
    }

    public function view(User $user, ExpenseCategory $category): bool
    {
        return $this->owns($user, $category);
    }

    public function create(User $user): bool
    {
        return $user->isCompany();
    }

    public function update(User $user, ExpenseCategory $category): bool
    {
        return $this->owns($user, $category);
    }

    public function delete(User $user, ExpenseCategory $category): bool
    {
        return $this->owns($user, $category);
    }

    private function owns(User $user, ExpenseCategory $category): bool
    {
        return $user->isCompany() && $category->company_id === $user->getKey();
    }
}
