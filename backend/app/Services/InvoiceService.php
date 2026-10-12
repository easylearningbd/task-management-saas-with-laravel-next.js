<?php

namespace App\Services;

use App\Enums\InvoiceItemType;
use App\Enums\InvoiceStatus;
use App\Enums\PaymentStatus;
use App\Models\Client;
use App\Models\Invoice;
use App\Models\Project;
use App\Models\ProjectItem;
use App\Models\Task;
use App\Models\Tax;
use App\Support\Billing\InvoiceNumber;
use App\Support\Money;
use App\Support\Tenancy\Tenancy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Company invoices (PRD §6.8) — every CALCULATION RULE lives here, on decimal strings with bcmath
 * (never floats), and every amount is recomputed from the lines on each save: whatever totals a
 * client sends are ignored.
 *
 *   line total     = quantity × price (rounded half-up to the cent)
 *   subtotal       = Σ line totals
 *   discount       = a flat amount, 0 … subtotal
 *   each tax       = (subtotal − discount) × rate / 100 (rounded per tax) — tax applies AFTER the
 *                    discount; tax_amount = Σ taxes
 *   total          = subtotal − discount + tax_amount
 *   paid_amount    = Σ Paid payments · balance_due = total − paid, never below 0
 *   status         = no payment → Draft (Sent once sent_at is set) · 0 < paid < total → Partial ·
 *                    paid ≥ total → Paid (settle(), after every payment add / delete)
 *
 * The client, project, items, tasks and taxes are read through the tenant scope, so another
 * company's ids are simply not found → 422. The project must belong to the client; an item or task
 * must belong to the project. Only Draft and Sent invoices can be edited or deleted (422 otherwise).
 * Each invoice gets INV-{YYYY}-{NNNN} (per company, under a lock) and an unguessable public token.
 * Tax names and rates are SNAPSHOTTED into invoice_taxes, so a later rate change never rewrites an
 * invoice. Runs in the current company's context.
 */
class InvoiceService
{
    /** Length of the public share token — 40 random [A-Za-z0-9] (≈ 238 bits). */
    public const TOKEN_LENGTH = 40;

    /**
     * The company's invoices for the list, with the client and project (no N+1).
     *
     * @param  array{search?: ?string, status?: ?string, client_id?: ?int, project_id?: ?int, date_from?: ?string, date_to?: ?string, overdue?: bool}  $filters
     * @return Builder<Invoice>
     */
    public function query(array $filters): Builder
    {
        return Invoice::query()->with(['client', 'project'])->filter($filters);
    }

    /**
     * Pure arithmetic: the line totals, subtotal, discount, each tax and the total. Throws a 422 for
     * a discount outside 0 … subtotal.
     *
     * @param  list<array{quantity: string, price: string}>  $lines
     * @param  iterable<Tax>  $taxes
     * @return array{lines: list<string>, subtotal: string, discount: string, taxes: list<array{tax_id: int, name: string, rate: string, amount: string}>, tax_amount: string, total: string}
     */
    public function calculate(array $lines, string $discount, iterable $taxes): array
    {
        $totals = [];
        $subtotal = '0.00';
        foreach ($lines as $line) {
            $total = Money::round(bcmul($line['quantity'], $line['price'], 6));
            $totals[] = $total;
            $subtotal = bcadd($subtotal, $total, 2);
        }

        $discount = bcadd($discount, '0', 2);
        if (bccomp($discount, '0', 2) < 0) {
            $this->fail('discount_amount', __('The discount can\'t be negative.'));
        }
        if (bccomp($discount, $subtotal, 2) > 0) {
            $this->fail('discount_amount', __('The discount can\'t be more than the subtotal (:subtotal).', ['subtotal' => Money::format($subtotal)]));
        }

        $taxable = bcsub($subtotal, $discount, 2);
        $applied = [];
        $taxAmount = '0.00';
        foreach ($taxes as $tax) {
            $amount = Money::round(bcdiv(bcmul($taxable, (string) $tax->rate, 6), '100', 6));
            $applied[] = ['tax_id' => $tax->id, 'name' => $tax->name, 'rate' => bcadd((string) $tax->rate, '0', 2), 'amount' => $amount];
            $taxAmount = bcadd($taxAmount, $amount, 2);
        }

        return [
            'lines' => $totals,
            'subtotal' => $subtotal,
            'discount' => $discount,
            'taxes' => $applied,
            'tax_amount' => $taxAmount,
            'total' => bcadd($taxable, $taxAmount, 2),
        ];
    }

    /**
     * @param  array<string, mixed>  $data  client_id, project_id, invoice_date, due_date, discount_amount, notes, tax_ids[], items[]
     */
    public function create(array $data, ?Carbon $now = null): Invoice
    {
        return DB::transaction(function () use ($data, $now): Invoice {
            $resolved = $this->resolve($data);
            $companyId = Tenancy::instance()->requireCompanyId();

            $invoice = new Invoice;
            $invoice->forceFill([
                'invoice_number' => InvoiceNumber::next($companyId, $now),
                'public_token' => $this->newToken(),
                'status' => InvoiceStatus::Draft,
                'paid_amount' => '0.00',
            ]);
            $this->write($invoice, $data, $resolved);

            return $this->fresh($invoice);
        });
    }

    /**
     * Replaces everything the form edits (header, lines, taxes) and recomputes every amount.
     * Draft and Sent only.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(Invoice $invoice, array $data): Invoice
    {
        return DB::transaction(function () use ($invoice, $data): Invoice {
            $invoice = $this->lockEditable($invoice, __('Paid and partially paid invoices can\'t be edited.'));
            $resolved = $this->resolve($data);

            $invoice->items()->delete();
            $invoice->taxes()->delete();
            $this->write($invoice, $data, $resolved);

            return $this->fresh($invoice);
        });
    }

    /**
     * Marks a Draft invoice as sent (`sent_at`, status Sent) — reserved for Send Invoice; the demo
     * seeder uses it today. An invoice that already has payments keeps its Partial / Paid status.
     */
    public function markSent(Invoice $invoice, ?Carbon $at = null): Invoice
    {
        return DB::transaction(function () use ($invoice, $at): Invoice {
            /** @var Invoice $locked */
            $locked = Invoice::query()->lockForUpdate()->findOrFail($invoice->getKey());
            $locked->forceFill(['sent_at' => $at ?? Carbon::now()])->save();

            return $this->settle($locked);
        });
    }

    /** Soft delete — Draft and Sent only. */
    public function delete(Invoice $invoice): void
    {
        DB::transaction(function () use ($invoice): void {
            $this->lockEditable($invoice, __('Paid and partially paid invoices can\'t be deleted.'))->delete();
        });
    }

    /**
     * Recomputes paid_amount, balance_due and status from the invoice's Paid payments (CALCULATION
     * RULES 6–7). Called after every payment add / delete, and after an edit. The balance never
     * goes below 0 — PaymentService also refuses any payment above it.
     */
    public function settle(Invoice $invoice): Invoice
    {
        $amounts = $invoice->payments()->where('invoice_payments.status', PaymentStatus::Paid->value)->pluck('amount');
        $paid = $amounts->reduce(fn (string $sum, $amount): string => bcadd($sum, (string) $amount, 2), '0.00');
        $balance = bcsub((string) $invoice->total, $paid, 2);
        if (bccomp($balance, '0', 2) < 0) {
            $balance = '0.00';
        }

        $status = match (true) {
            $amounts->isEmpty() => $invoice->sent_at !== null ? InvoiceStatus::Sent : InvoiceStatus::Draft,
            bccomp($paid, (string) $invoice->total, 2) >= 0 => InvoiceStatus::Paid,
            default => InvoiceStatus::Partial,
        };

        $invoice->forceFill(['paid_amount' => $paid, 'balance_due' => $balance, 'status' => $status])->save();

        return $invoice;
    }

    /**
     * The client, project, taxes and lines of a create / update, checked against the company's own
     * records (another company's ids aren't found → 422).
     *
     * @param  array<string, mixed>  $data
     * @return array{client: Client, project: Project, taxes: Collection<int, Tax>, lines: list<array{type: InvoiceItemType, project_item_id: ?int, task_id: ?int, description: string, quantity: string, price: string}>}
     */
    private function resolve(array $data): array
    {
        $client = Client::query()->find($data['client_id'] ?? null);
        if (! $client) {
            $this->fail('client_id', __('The selected client is invalid.'));
        }
        $project = Project::query()->find($data['project_id'] ?? null);
        if (! $project) {
            $this->fail('project_id', __('The selected project is invalid.'));
        }
        if ($project->client_id !== $client->id) {
            $this->fail('project_id', __('The selected project doesn\'t belong to this client.'));
        }

        $invoiceDate = Carbon::parse((string) $data['invoice_date'])->startOfDay();
        if (Carbon::parse((string) $data['due_date'])->startOfDay()->lt($invoiceDate)) {
            $this->fail('due_date', __('The due date can\'t be before the invoice date.'));
        }

        $taxIds = array_values(array_unique(array_map('intval', $data['tax_ids'] ?? [])));
        $taxes = Tax::query()->active()->whereIn('id', $taxIds)->orderBy('id')->get();
        if ($taxes->count() !== count($taxIds)) {
            $this->fail('tax_ids', __('One of the selected taxes is invalid.'));
        }

        $items = array_values($data['items'] ?? []);
        if ($items === []) {
            $this->fail('items', __('Add at least one line item.'));
        }

        $lines = [];
        foreach ($items as $i => $item) {
            $type = InvoiceItemType::from((string) $item['type']);
            $quantity = $this->decimal($item['quantity'] ?? null, "items.$i.quantity");
            $price = $this->decimal($item['price'] ?? null, "items.$i.price");
            if (bccomp($quantity, '0', 2) <= 0) {
                $this->fail("items.$i.quantity", __('The quantity must be greater than 0.'));
            }
            if (bccomp($price, '0', 2) < 0) {
                $this->fail("items.$i.price", __('The price can\'t be negative.'));
            }

            $description = trim((string) ($item['description'] ?? ''));
            if ($type === InvoiceItemType::Item) {
                $source = ProjectItem::query()->where('project_id', $project->id)->find($item['project_item_id'] ?? null);
                if (! $source) {
                    $this->fail("items.$i.project_item_id", __('Choose one of this project\'s items.'));
                }
                $fallback = $source->name;
            } else {
                $source = Task::query()->where('project_id', $project->id)->find($item['task_id'] ?? null);
                if (! $source) {
                    $this->fail("items.$i.task_id", __('Choose one of this project\'s tasks.'));
                }
                $fallback = $source->title;
            }

            $lines[] = [
                'type' => $type,
                'project_item_id' => $type === InvoiceItemType::Item ? $source->id : null,
                'task_id' => $type === InvoiceItemType::Task ? $source->id : null,
                'description' => $description !== '' ? $description : $fallback,
                'quantity' => $quantity,
                'price' => $price,
            ];
        }

        return ['client' => $client, 'project' => $project, 'taxes' => $taxes, 'lines' => $lines];
    }

    /**
     * Writes the header, the lines and the tax snapshots, with every amount computed here.
     *
     * @param  array<string, mixed>  $data
     * @param  array{client: Client, project: Project, taxes: Collection<int, Tax>, lines: list<array<string, mixed>>}  $resolved
     */
    private function write(Invoice $invoice, array $data, array $resolved): void
    {
        $sums = $this->calculate($resolved['lines'], $this->decimal($data['discount_amount'] ?? '0', 'discount_amount'), $resolved['taxes']);

        $notes = trim((string) ($data['notes'] ?? ''));
        $invoice->forceFill([
            'client_id' => $resolved['client']->id,
            'project_id' => $resolved['project']->id,
            'invoice_date' => Carbon::parse((string) $data['invoice_date'])->toDateString(),
            'due_date' => Carbon::parse((string) $data['due_date'])->toDateString(),
            'subtotal' => $sums['subtotal'],
            'discount_amount' => $sums['discount'],
            'tax_amount' => $sums['tax_amount'],
            'total' => $sums['total'],
            'notes' => $notes !== '' ? $notes : null,
        ])->save();

        foreach ($resolved['lines'] as $position => $line) {
            $invoice->items()->make()->forceFill([...$line, 'total' => $sums['lines'][$position], 'position' => $position + 1])->save();
        }
        foreach ($sums['taxes'] as $tax) {
            $invoice->taxes()->make()->forceFill($tax)->save();
        }

        $this->settle($invoice);
    }

    /** Re-reads the invoice under a row lock and refuses one that is no longer Draft / Sent. */
    private function lockEditable(Invoice $invoice, string $message): Invoice
    {
        /** @var Invoice $locked */
        $locked = Invoice::query()->lockForUpdate()->findOrFail($invoice->getKey());
        if (! $locked->isEditable()) {
            $this->fail('invoice', $message);
        }

        return $locked;
    }

    private function fresh(Invoice $invoice): Invoice
    {
        return $invoice->refresh()->load(['client', 'project', 'items', 'taxes', 'payments']);
    }

    /** The value as a 2-place decimal string; anything non-numeric → 422 on `$field`. */
    private function decimal(mixed $value, string $field): string
    {
        if (! is_numeric($value)) {
            $this->fail($field, __('Enter a number.'));
        }

        return bcadd((string) $value, '0', 2);
    }

    /** An unguessable share token, unique across every invoice (deleted ones included). */
    private function newToken(): string
    {
        do {
            $token = Str::random(self::TOKEN_LENGTH);
        } while (DB::table('invoices')->where('public_token', $token)->exists());

        return $token;
    }

    private function fail(string $field, string $message): never
    {
        throw ValidationException::withMessages([$field => $message]);
    }
}
