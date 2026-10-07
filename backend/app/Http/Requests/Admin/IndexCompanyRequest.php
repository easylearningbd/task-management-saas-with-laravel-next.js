<?php

namespace App\Http\Requests\Admin;

use App\Enums\UserStatus;
use App\Http\Requests\IndexRequest;
use App\Models\Company;
use Illuminate\Contracts\Database\Query\Expression;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * GET /api/v1/admin/companies — search (name or email), `status`, `plan_id` and an inclusive
 * `created_from` / `created_to` range, plus the shared list parameters.
 */
class IndexCompanyRequest extends IndexRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('viewAny', Company::class);
    }

    /**
     * `status` is an ENUM: cast to text so it sorts alphabetically on MySQL too.
     *
     * @return array<string, string|Expression>
     */
    public function sortable(): array
    {
        return [
            'name' => 'name',
            'email' => 'email',
            'status' => DB::raw('CAST(status AS CHAR)'),
            'created_at' => 'created_at',
        ];
    }

    /** Oldest first, as in the Companies screenshot. */
    public function defaultSort(): string
    {
        return 'created_at';
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    protected function filterRules(): array
    {
        return [
            'status' => ['nullable', Rule::enum(UserStatus::class)],
            'plan_id' => ['nullable', 'integer', 'min:1'],
            'created_from' => ['nullable', 'date_format:Y-m-d'],
            'created_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:created_from'],
        ];
    }

    /**
     * @return array{search: ?string, status: ?string, plan_id: ?int, created_from: ?string, created_to: ?string}
     */
    public function filters(): array
    {
        $planId = $this->validated('plan_id');

        return [
            'search' => $this->search(),
            'status' => $this->validated('status'),
            'plan_id' => $planId === null ? null : (int) $planId,
            'created_from' => $this->validated('created_from'),
            'created_to' => $this->validated('created_to'),
        ];
    }
}
