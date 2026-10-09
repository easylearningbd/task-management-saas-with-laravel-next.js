<?php

namespace App\Policies;

use App\Models\TaskStage;
use App\Models\User;

/**
 * Belt and braces on top of BelongsToCompany: only a company works with task stages, and only
 * with its own. (The global scope already makes another company's stage unresolvable — 404 —
 * so `owns()` is the second line, not the first.) Reordering touches the company's whole
 * workflow, never a single record, so it is a company-level ability.
 */
class TaskStagePolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isCompany();
    }

    public function view(User $user, TaskStage $stage): bool
    {
        return $this->owns($user, $stage);
    }

    public function create(User $user): bool
    {
        return $user->isCompany();
    }

    public function update(User $user, TaskStage $stage): bool
    {
        return $this->owns($user, $stage);
    }

    public function delete(User $user, TaskStage $stage): bool
    {
        return $this->owns($user, $stage);
    }

    public function reorder(User $user): bool
    {
        return $user->isCompany();
    }

    private function owns(User $user, TaskStage $stage): bool
    {
        return $user->isCompany() && $stage->company_id === $user->getKey();
    }
}
