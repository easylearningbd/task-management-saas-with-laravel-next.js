<?php

namespace App\Policies;

use App\Models\Client;
use App\Models\User;

/**
 * Belt and braces on top of BelongsToCompany: only a company works with clients, and only with
 * its own. (The global scope already makes another company's client unresolvable — 404 —
 * so `owns()` is the second line, not the first.)
 */
class ClientPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isCompany();
    }

    public function view(User $user, Client $client): bool
    {
        return $this->owns($user, $client);
    }

    public function create(User $user): bool
    {
        return $user->isCompany();
    }

    public function update(User $user, Client $client): bool
    {
        return $this->owns($user, $client);
    }

    public function delete(User $user, Client $client): bool
    {
        return $this->owns($user, $client);
    }

    private function owns(User $user, Client $client): bool
    {
        return $user->isCompany() && $client->company_id === $user->getKey();
    }
}
