<?php

namespace App\Http\Requests\Company;

use App\Enums\InvoiceStatus;
use App\Http\Requests\IndexRequest;
use App\Models\Invoice;
use Illuminate\Validation\Rule;

/**
 * GET /api/v1/invoices — search (invoice number, client name / email, project name), status,
 * client, project, an invoice-date range (inclusive), `overdue` (past due with money owed — the
 * Filters panel's "Overdue only"), sort (the list's sortable columns; anything
 * else → 422), page, per_page (10, max 100). Newest first by default. A client / project id of
 * another company simply matches nothing — the tenant scope applies to the whole query.
 */
class IndexInvoiceRequest extends IndexRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('viewAny', Invoice::class);
    }

    /**
     * @return array<string, string>
     */
    public function sortable(): array
    {
        return [
            'invoice_number' => 'invoices.invoice_number',
            'invoice_date' => 'invoices.invoice_date',
            'due_date' => 'invoices.due_date',
            'total' => 'invoices.total',
            'balance_due' => 'invoices.balance_due',
        ];
    }

    public function defaultSort(): string
    {
        return 'invoices.created_at';
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
            'status' => ['nullable', Rule::enum(InvoiceStatus::class)],
            'client_id' => ['nullable', 'integer', 'min:1'],
            'project_id' => ['nullable', 'integer', 'min:1'],
            'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'],
            'overdue' => ['nullable', 'boolean'],
        ];
    }

    /**
     * @return array{search: ?string, status: ?string, client_id: ?int, project_id: ?int, date_from: ?string, date_to: ?string, overdue: bool}
     */
    public function filters(): array
    {
        $id = fn (string $key): ?int => $this->validated($key) !== null ? (int) $this->validated($key) : null;

        return [
            'search' => $this->search(),
            'status' => $this->validated('status'),
            'client_id' => $id('client_id'),
            'project_id' => $id('project_id'),
            'date_from' => $this->validated('date_from'),
            'date_to' => $this->validated('date_to'),
            'overdue' => (bool) $this->validated('overdue'),
        ];
    }
}
