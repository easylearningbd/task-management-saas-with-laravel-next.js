<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Database\Query\Expression;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Base Form Request for every paginated list endpoint (CLAUDE.md §8): validates the shared
 * `search`, `sort`, `direction`, `page` and `per_page` parameters, plus the module's own
 * filters from `filterRules()`.
 *
 * `sort` must be one of `sortable()` — anything else is a 422, so raw input never reaches an
 * ORDER BY. Pair with App\Support\ListQuery::paginate().
 */
abstract class IndexRequest extends FormRequest
{
    public const DEFAULT_PER_PAGE = 10;

    public const MAX_PER_PAGE = 100;

    /**
     * Columns the list may be sorted by (request value => column, or an Expression written in
     * code — e.g. to sort an ENUM alphabetically, since MySQL orders ENUMs by declaration).
     *
     * @return array<string, string|Expression>
     */
    abstract public function sortable(): array;

    /** Sort used when the request has none; need not be user-selectable. */
    public function defaultSort(): string
    {
        return 'id';
    }

    public function defaultDirection(): string
    {
        return 'asc';
    }

    /**
     * The module's filter rules (`type`, `status`, date ranges, …).
     *
     * @return array<string, array<int, mixed>>
     */
    protected function filterRules(): array
    {
        return [];
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:100'],
            'sort' => ['nullable', 'string', Rule::in(array_keys($this->sortable()))],
            'direction' => ['nullable', 'string', Rule::in(['asc', 'desc'])],
            'page' => ['nullable', 'integer', 'min:1'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:'.self::MAX_PER_PAGE],
            ...$this->filterRules(),
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'sort.in' => __('The list cannot be sorted by this column.'),
        ];
    }

    public function search(): ?string
    {
        $search = trim((string) $this->validated('search'));

        return $search === '' ? null : $search;
    }

    /** The column to order by (always from the whitelist or the default). */
    public function sortColumn(): string|Expression
    {
        $sort = $this->validated('sort');

        return $sort !== null ? $this->sortable()[$sort] : $this->defaultSort();
    }

    public function sortDirection(): string
    {
        return $this->validated('direction') ?? ($this->validated('sort') !== null ? 'asc' : $this->defaultDirection());
    }

    public function perPage(): int
    {
        return (int) ($this->validated('per_page') ?? self::DEFAULT_PER_PAGE);
    }
}
