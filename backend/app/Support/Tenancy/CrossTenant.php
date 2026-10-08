<?php

namespace App\Support\Tenancy;

use App\Models\Scopes\CompanyScope;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * The ONLY sanctioned way to read tenant data across companies — Super Admin reports, system
 * jobs. It cannot be used by accident from company code: it throws MissingCompanyContext when
 * a company is in context (a signed-in company, an impersonated one, or inside `runAs()`).
 * Company controllers are additionally scanned by a test for any use of it or of
 * `withoutGlobalScope(s)`.
 *
 *     CrossTenant::query(Client::class)->where('company_id', $company->id)->count();
 */
final class CrossTenant
{
    /**
     * @template TModel of Model
     *
     * @param  class-string<TModel>  $model
     * @return Builder<TModel>
     */
    public static function query(string $model): Builder
    {
        if (Tenancy::instance()->hasCompany()) {
            throw MissingCompanyContext::crossTenantInsideCompany();
        }

        return $model::query()->withoutGlobalScope(CompanyScope::class);
    }
}
