<?php

namespace App\Policies;

use App\Models\Milestone;
use App\Models\User;

/** Belt and braces on top of BelongsToCompany: a company works only with its own milestones. */
class MilestonePolicy
{
    public function update(User $user, Milestone $milestone): bool
    {
        return $this->owns($user, $milestone);
    }

    public function delete(User $user, Milestone $milestone): bool
    {
        return $this->owns($user, $milestone);
    }

    private function owns(User $user, Milestone $milestone): bool
    {
        return $user->isCompany() && $milestone->company_id === $user->getKey();
    }
}
