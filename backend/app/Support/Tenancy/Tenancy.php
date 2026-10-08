<?php

namespace App\Support\Tenancy;

use App\Enums\UserType;
use App\Models\User;
use Closure;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/**
 * Which company the current code runs for — the single source of truth for every tenant-owned
 * model (CLAUDE.md §7, PRD §3). Registered as a scoped singleton: one instance per request /
 * job, so nothing leaks between them.
 *
 * Resolution, first match wins:
 *  1. an explicit context opened with `runAs()` — seeders, console commands, queue jobs, tests;
 *  2. the signed-in user, when it is a company (impersonation included: the session's user IS
 *     the company being viewed);
 *  3. otherwise none — guests, console without `runAs()`, and super admins.
 *
 * "None" never means "everyone": tenant queries then match no rows and tenant creates throw
 * (see CompanyScope and BelongsToCompany). Admin code that must read across companies says so
 * explicitly with CrossTenant.
 */
final class Tenancy
{
    /** Set while inside runAs(): the company id the callback runs for. */
    private ?int $explicit = null;

    public static function instance(): self
    {
        return app(self::class);
    }

    /** The current company's id, or null when there is none. */
    public function companyId(): ?int
    {
        if ($this->explicit !== null) {
            return $this->explicit;
        }

        $user = Auth::user();

        return $user instanceof User && $user->isCompany() ? (int) $user->getKey() : null;
    }

    public function hasCompany(): bool
    {
        return $this->companyId() !== null;
    }

    /** The current company's id, or MissingCompanyContext. */
    public function requireCompanyId(): int
    {
        return $this->companyId() ?? throw MissingCompanyContext::forWrite();
    }

    /**
     * Run `$callback` as `$company` — the way seeders, console commands and queue jobs work with
     * tenant data. The previous context is restored afterwards, even on an exception, so calls
     * nest. Only a company account (users.type = company) is accepted.
     *
     * @template T
     *
     * @param  Closure(): T  $callback
     * @return T
     */
    public function runAs(User|int $company, Closure $callback): mixed
    {
        $id = $company instanceof User ? (int) $company->getKey() : $company;

        $isCompany = $company instanceof User
            ? $company->isCompany()
            : DB::table('users')->where('id', $id)->where('type', UserType::Company->value)->exists();

        if (! $isCompany) {
            throw MissingCompanyContext::notACompany($id);
        }

        $previous = $this->explicit;
        $this->explicit = $id;

        try {
            return $callback();
        } finally {
            $this->explicit = $previous;
        }
    }
}
