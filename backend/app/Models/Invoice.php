<?php

namespace App\Models;

use App\Enums\InvoiceStatus;
use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * A company invoice (PRD §6.8). Written only by InvoiceService (create / update / delete) and
 * PaymentService (paid, balance, status): every amount is server-computed, so nothing here is
 * mass-assignable — services use forceFill.
 *
 * @property int $id
 * @property int $company_id
 * @property int $client_id
 * @property int $project_id
 * @property string $invoice_number
 * @property Carbon $invoice_date
 * @property Carbon $due_date
 * @property string $subtotal
 * @property string $discount_amount
 * @property string $tax_amount
 * @property string $total
 * @property string $paid_amount
 * @property string $balance_due
 * @property InvoiceStatus $status
 * @property string|null $notes
 * @property string $public_token
 * @property Carbon|null $sent_at
 */
class Invoice extends Model
{
    use BelongsToCompany, SoftDeletes;

    protected $fillable = [];

    protected $hidden = ['public_token'];

    protected function casts(): array
    {
        return [
            'invoice_date' => 'date',
            'due_date' => 'date',
            'subtotal' => 'decimal:2',
            'discount_amount' => 'decimal:2',
            'tax_amount' => 'decimal:2',
            'total' => 'decimal:2',
            'paid_amount' => 'decimal:2',
            'balance_due' => 'decimal:2',
            'status' => InvoiceStatus::class,
            'sent_at' => 'datetime',
        ];
    }

    /** The client — still shown if it was deleted (soft) after invoicing. */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class)->withTrashed();
    }

    /** The project — still shown if it was deleted (soft) after invoicing. */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class)->withTrashed();
    }

    /** The lines, in the form's order. */
    public function items(): HasMany
    {
        return $this->hasMany(InvoiceItem::class)->orderBy('invoice_items.position');
    }

    /** The applied taxes — snapshots of name and rate. */
    public function taxes(): HasMany
    {
        return $this->hasMany(InvoiceTax::class)->orderBy('invoice_taxes.id');
    }

    /** Payments received, oldest first (the Payment History table). */
    public function payments(): HasMany
    {
        return $this->hasMany(InvoicePayment::class)->orderBy('invoice_payments.payment_date')->orderBy('invoice_payments.id');
    }

    public function isEditable(): bool
    {
        return $this->status->isEditable();
    }

    /** Past its due date with money still owed. */
    public function isOverdue(?Carbon $today = null): bool
    {
        return $this->status !== InvoiceStatus::Paid
            && bccomp((string) $this->balance_due, '0', 2) > 0
            && $this->due_date->lt(($today ?? Carbon::today())->copy()->startOfDay());
    }

    /**
     * The list filters: search (invoice number, client name / email, project name — LIKE-escaped),
     * status, client, project, an invoice-date range (inclusive) and overdue only.
     *
     * @param  Builder<Invoice>  $query
     * @param  array{search?: ?string, status?: ?string, client_id?: ?int, project_id?: ?int, date_from?: ?string, date_to?: ?string, overdue?: bool}  $filters
     */
    public function scopeFilter(Builder $query, array $filters): void
    {
        $search = trim((string) ($filters['search'] ?? ''));
        if ($search !== '') {
            $like = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $search).'%';
            $query->where(function (Builder $q) use ($like): void {
                $q->whereRaw("invoices.invoice_number like ? escape '!'", [$like])
                    ->orWhereHas('client', fn (Builder $c) => $c->where(fn (Builder $w) => $w
                        ->whereRaw("clients.name like ? escape '!'", [$like])
                        ->orWhereRaw("clients.email like ? escape '!'", [$like])))
                    ->orWhereHas('project', fn (Builder $p) => $p->whereRaw("projects.name like ? escape '!'", [$like]));
            });
        }

        $query
            ->when($filters['status'] ?? null, fn (Builder $q, string $status) => $q->where('invoices.status', $status))
            ->when($filters['client_id'] ?? null, fn (Builder $q, int $id) => $q->where('invoices.client_id', $id))
            ->when($filters['project_id'] ?? null, fn (Builder $q, int $id) => $q->where('invoices.project_id', $id))
            ->when($filters['date_from'] ?? null, fn (Builder $q, string $from) => $q->whereDate('invoices.invoice_date', '>=', $from))
            ->when($filters['date_to'] ?? null, fn (Builder $q, string $to) => $q->whereDate('invoices.invoice_date', '<=', $to))
            ->when($filters['overdue'] ?? false, fn (Builder $q) => $q->overdue());
    }

    /**
     * Past due with money owed — the same rule as isOverdue().
     *
     * @param  Builder<Invoice>  $query
     */
    public function scopeOverdue(Builder $query, ?Carbon $today = null): void
    {
        $query->where('invoices.status', '!=', InvoiceStatus::Paid->value)
            ->where('invoices.balance_due', '>', 0)
            ->whereDate('invoices.due_date', '<', ($today ?? Carbon::today())->toDateString());
    }
}
