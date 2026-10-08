<?php

namespace App\Models\Concerns;

use App\Models\Company;
use App\Models\Scopes\CompanyScope;
use App\Support\Tenancy\MissingCompanyContext;
use App\Support\Tenancy\Tenancy;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * For every model owned by a company (clients, projects, tasks, invoices, …) — CLAUDE.md §7.
 *
 *  - Reads: a global CompanyScope limits every query — including route-model binding, so
 *    another company's id resolves to nothing and the route answers 404 — to the current
 *    company. No company in context → no rows.
 *  - Create: `company_id` is always set from Tenancy, overwriting anything in the payload or
 *    assigned by hand. No company in context → MissingCompanyContext.
 *  - Update: `company_id` can never change.
 *
 * Never put `company_id` in `$fillable`, never accept it from a request and never call
 * `withoutGlobalScope(s)` in company code (a test scans the company controllers for it). The
 * one way to read across companies is CrossTenant, which refuses to run in a company context.
 *
 * @mixin Model
 */
trait BelongsToCompany
{
    public static function bootBelongsToCompany(): void
    {
        static::addGlobalScope(new CompanyScope);

        static::creating(function (Model $model): void {
            $model->setAttribute('company_id', Tenancy::instance()->requireCompanyId());
        });

        static::updating(function (Model $model): void {
            if ($model->isDirty('company_id')) {
                throw MissingCompanyContext::companyIdChanged();
            }
        });
    }

    /**
     * @return BelongsTo<Company, $this>
     */
    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_id');
    }
}
