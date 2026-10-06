<?php

namespace App\Support;

use App\Http\Requests\IndexRequest;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * Sorts and paginates an already-filtered query from an IndexRequest. The sort column comes
 * from the request's whitelist; the primary key is added as a tie-breaker so rows with equal
 * values (same type, same date, no date) keep a stable order across pages.
 */
final class ListQuery
{
    /**
     * @template TModel of Model
     *
     * @param  Builder<TModel>  $query
     * @return LengthAwarePaginator<int, TModel>
     */
    public static function paginate(Builder $query, IndexRequest $request): LengthAwarePaginator
    {
        $direction = $request->sortDirection();
        $key = $query->getModel()->getQualifiedKeyName();
        $column = $request->sortColumn();

        $query->orderBy($column, $direction);
        if (! is_string($column) || $column !== $query->getModel()->getKeyName()) {
            $query->orderBy($key, $direction);
        }

        return $query->paginate($request->perPage())->withQueryString();
    }
}
