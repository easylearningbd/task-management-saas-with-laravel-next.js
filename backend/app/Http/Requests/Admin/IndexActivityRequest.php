<?php

namespace App\Http\Requests\Admin;

use App\Enums\CompanyActivityAction;
use App\Http\Requests\IndexRequest;
use App\Models\Company;
use Illuminate\Validation\Rule;

/**
 * The activity log (global, or one company's): newest first, optional `action` filter.
 * Viewing activity is part of viewing companies.
 */
class IndexActivityRequest extends IndexRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('viewAny', Company::class);
    }

    /**
     * @return array<string, string>
     */
    public function sortable(): array
    {
        return ['created_at' => 'created_at'];
    }

    public function defaultSort(): string
    {
        return 'created_at';
    }

    public function defaultDirection(): string
    {
        return 'desc';
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    protected function filterRules(): array
    {
        return [
            'action' => ['nullable', Rule::enum(CompanyActivityAction::class)],
        ];
    }
}
