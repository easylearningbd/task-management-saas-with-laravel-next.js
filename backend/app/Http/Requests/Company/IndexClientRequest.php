<?php

namespace App\Http\Requests\Company;

use App\Enums\ClientStatus;
use App\Http\Requests\IndexRequest;
use App\Models\Client;
use Illuminate\Database\Query\Expression;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * GET /api/v1/clients — search (name, email, company, phone), status, created date range,
 * sort (whitelist below; anything else → 422 from IndexRequest), page, per_page (10, max 100).
 */
class IndexClientRequest extends IndexRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('viewAny', Client::class);
    }

    /**
     * `status` is an ENUM: cast to text so it sorts alphabetically on MySQL too.
     *
     * @return array<string, string|Expression>
     */
    public function sortable(): array
    {
        return [
            'name' => 'clients.name',
            'email' => 'clients.email',
            'company_name' => 'clients.company_name',
            'status' => DB::raw('CAST(clients.status AS CHAR)'),
            'created_at' => 'clients.created_at',
        ];
    }

    /** Oldest first, as in the Clients screenshot. */
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
            'status' => ['nullable', Rule::enum(ClientStatus::class)],
            'created_from' => ['nullable', 'date_format:Y-m-d'],
            'created_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:created_from'],
        ];
    }

    /**
     * @return array{search: ?string, status: ?string, created_from: ?string, created_to: ?string}
     */
    public function filters(): array
    {
        return [
            'search' => $this->search(),
            'status' => $this->validated('status'),
            'created_from' => $this->validated('created_from'),
            'created_to' => $this->validated('created_to'),
        ];
    }
}
