<?php

namespace App\Models\Scopes;

use App\Support\Tenancy\Tenancy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

/**
 * Every query on a tenant-owned model is limited to the current company (Tenancy). With no
 * company in context the query matches nothing — fail closed: a guest, a super admin or a
 * console command without `runAs()` sees an empty table, never everyone's rows.
 *
 * Eloquent applies global scopes inside a nested where group when the query has OR clauses,
 * so `->orWhere('company_id', $other)` cannot widen it either (tested).
 */
final class CompanyScope implements Scope
{
    public function apply(Builder $builder, Model $model): void
    {
        $companyId = Tenancy::instance()->companyId();
        $column = $model->qualifyColumn('company_id');

        if ($companyId === null) {
            $builder->whereRaw('1 = 0');

            return;
        }

        $builder->where($column, $companyId);
    }
}
