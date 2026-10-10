<?php

namespace App\Policies;

use App\Models\Project;
use App\Models\User;

/**
 * Belt and braces on top of BelongsToCompany: only a company works with projects, and only with
 * its own. (The global scope already makes another company's project unresolvable — 404 — so
 * `owns()` is the second line, not the first.) Updating a project also covers managing its
 * tabs (milestones, items, notes, expenses, files).
 */
class ProjectPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isCompany();
    }

    public function view(User $user, Project $project): bool
    {
        return $this->owns($user, $project);
    }

    public function create(User $user): bool
    {
        return $user->isCompany();
    }

    public function update(User $user, Project $project): bool
    {
        return $this->owns($user, $project);
    }

    public function delete(User $user, Project $project): bool
    {
        return $this->owns($user, $project);
    }

    private function owns(User $user, Project $project): bool
    {
        return $user->isCompany() && $project->company_id === $user->getKey();
    }
}
