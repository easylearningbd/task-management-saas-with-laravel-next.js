<?php

namespace App\Policies;

use App\Models\Plan;
use App\Models\User;

/**
 * Subscription plans are platform data: only the Super Admin manages them. (The routes are
 * also behind `role:super_admin`; this is the model-level check CLAUDE.md §8 asks for.)
 */
class PlanPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isSuperAdmin();
    }

    public function view(User $user, Plan $plan): bool
    {
        return $user->isSuperAdmin();
    }

    public function create(User $user): bool
    {
        return $user->isSuperAdmin();
    }

    public function update(User $user, Plan $plan): bool
    {
        return $user->isSuperAdmin();
    }

    public function delete(User $user, Plan $plan): bool
    {
        return $user->isSuperAdmin();
    }
}
