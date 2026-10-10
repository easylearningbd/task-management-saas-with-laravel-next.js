<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Database\Eloquent\Model;

/**
 * The common policy of a tenant-owned record — belt and braces on top of BelongsToCompany: only
 * a company works with these, and only with its own. (The global scope already makes another
 * company's record unresolvable — 404 — so `owns()` is the second line, not the first.)
 */
abstract class CompanyOwnedPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isCompany();
    }

    public function view(User $user, Model $record): bool
    {
        return $this->owns($user, $record);
    }

    public function create(User $user): bool
    {
        return $user->isCompany();
    }

    public function update(User $user, Model $record): bool
    {
        return $this->owns($user, $record);
    }

    public function delete(User $user, Model $record): bool
    {
        return $this->owns($user, $record);
    }

    protected function owns(User $user, Model $record): bool
    {
        return $user->isCompany() && (int) $record->getAttribute('company_id') === (int) $user->getKey();
    }
}
