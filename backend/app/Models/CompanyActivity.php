<?php

namespace App\Models;

use App\Enums\CompanyActivityAction;
use Database\Factories\CompanyActivityFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One entry in a company's audit log. Written only by CompanyService (inside the same
 * transaction as the change it records) — never from request input.
 */
#[Fillable(['action', 'description', 'meta'])]
class CompanyActivity extends Model
{
    /** @use HasFactory<CompanyActivityFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'action' => CompanyActivityAction::class,
            'meta' => 'array',
        ];
    }

    /** The company it is about — deleted companies included, so their history stays readable. */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_id')->withTrashed();
    }

    /** Who did it (a super admin); null for system / seeder entries. */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id')->withTrashed();
    }

    /**
     * Newest first; ties broken by id so entries written in the same second keep their order.
     *
     * @param  Builder<CompanyActivity>  $query
     */
    public function scopeLatestFirst(Builder $query): void
    {
        $query->orderByDesc('created_at')->orderByDesc('id');
    }
}
