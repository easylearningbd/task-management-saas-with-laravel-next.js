<?php

namespace App\Policies;

use App\Models\Company;
use App\Models\User;

/**
 * Companies are managed by the Super Admin only. (The routes are also behind
 * `role:super_admin`; this is the model-level check CLAUDE.md §8 asks for.)
 */
class CompanyPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isSuperAdmin();
    }

    public function view(User $user, Company $company): bool
    {
        return $user->isSuperAdmin();
    }

    public function create(User $user): bool
    {
        return $user->isSuperAdmin();
    }

    public function update(User $user, Company $company): bool
    {
        return $user->isSuperAdmin();
    }

    public function delete(User $user, Company $company): bool
    {
        return $user->isSuperAdmin();
    }

    /** "Login as company": a super admin, and the target must really be a company. */
    public function impersonate(User $user, Company $company): bool
    {
        return $user->isSuperAdmin() && $company->isCompany();
    }
}
