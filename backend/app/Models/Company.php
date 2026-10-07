<?php

namespace App\Models;

use App\Enums\UserType;
use App\Services\ProfileService;
use Database\Factories\CompanyFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

/**
 * A tenant. Not a table of its own: a `users` row with `type = company` (CLAUDE.md §6/§7,
 * PRD §3) — single-table inheritance over User. Every tenant table will carry `company_id`
 * → `users.id`.
 *
 * - The global scope makes every Company query (and `{company}` route binding) see companies
 *   only, so a super admin's id is simply "not found".
 * - `type` is forced to `company` on every save: a Company can never become a super admin.
 * - Fillable / hidden / casts / soft deletes come from User (Eloquent resolves the parent's
 *   #[Fillable] and #[Hidden]); `type`, `status`, `is_login_enabled` and the plan columns stay
 *   unfillable and are only set by CompanyService.
 */
class Company extends User
{
    protected $table = 'users';

    protected static function booted(): void
    {
        static::addGlobalScope('company', function (Builder $query): void {
            $query->where($query->qualifyColumn('type'), UserType::Company->value);
        });

        static::saving(function (Company $company): void {
            $company->type = UserType::Company;
        });
    }

    /** The factory is CompanyFactory (HasFactory would otherwise follow the class name anyway). */
    protected static function newFactory(): CompanyFactory
    {
        return CompanyFactory::new();
    }

    /**
     * Case-insensitive "contains" match on name or email; LIKE wildcards in the term match
     * literally (explicit ESCAPE — MySQL and SQLite differ on the default). Always bound.
     *
     * @param  Builder<Company>  $query
     */
    public function scopeSearch(Builder $query, ?string $term): void
    {
        $term = trim((string) $term);
        if ($term === '') {
            return;
        }

        $like = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $term).'%';
        $query->where(fn (Builder $q) => $q
            ->whereRaw("users.name like ? escape '!'", [$like])
            ->orWhereRaw("users.email like ? escape '!'", [$like]));
    }

    /** The audit log, newest first. */
    public function activities(): HasMany
    {
        return $this->hasMany(CompanyActivity::class, 'company_id')->latestFirst();
    }

    /** Public URL of the uploaded avatar, or null (the UI then shows initials). */
    protected function avatarUrl(): Attribute
    {
        return Attribute::get(fn (): ?string => $this->avatar
            ? Storage::disk(ProfileService::AVATAR_DISK)->url($this->avatar)
            : null);
    }

    /** The plan's project limit: -1 = unlimited, null = no plan. */
    protected function maxProjects(): Attribute
    {
        return Attribute::get(fn (): ?int => $this->plan?->max_projects);
    }

    /** The plan's storage limit in GB as a 2-decimal string, null = no plan. */
    protected function storageLimitGb(): Attribute
    {
        return Attribute::get(fn (): ?string => $this->plan?->storage_limit_gb);
    }
}
