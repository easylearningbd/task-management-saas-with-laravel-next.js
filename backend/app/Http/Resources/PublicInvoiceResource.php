<?php

namespace App\Http\Resources;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\InvoiceTax;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * The public share page's payload (/i/{token}, PAGE SPEC D) — exactly what the document shows and
 * nothing more: no ids (not the invoice's, client's, project's, items' or taxes'), no token, no
 * other invoice, nothing about the company beyond its "Billed From" block (passed in as
 * `billed_from`). Amounts are 2-decimal strings; the paid amount is never negative.
 *
 * @mixin Invoice
 */
class PublicInvoiceResource extends JsonResource
{
    /**
     * @param  array<string, string|null>  $billedFrom
     */
    public function __construct(Invoice $invoice, private readonly array $billedFrom)
    {
        parent::__construct($invoice);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'invoice_number' => $this->invoice_number,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'invoice_date' => $this->invoice_date->toDateString(),
            'due_date' => $this->due_date->toDateString(),
            'billed_from' => $this->billedFrom,
            'bill_to' => $this->client ? [
                'name' => $this->client->name,
                'email' => $this->client->email,
                'phone' => $this->client->phone,
                'address' => $this->client->address,
            ] : null,
            'project' => $this->project ? ['name' => $this->project->name] : null,
            'items' => $this->items->map(fn (InvoiceItem $item): array => [
                'description' => $item->description,
                'quantity' => $item->quantity,
                'price' => $item->price,
                'total' => $item->total,
            ])->all(),
            'subtotal' => $this->subtotal,
            'discount_amount' => $this->discount_amount,
            'taxes' => $this->taxes->map(fn (InvoiceTax $tax): array => ['name' => $tax->name, 'rate' => $tax->rate, 'amount' => $tax->amount])->all(),
            'tax_amount' => $this->tax_amount,
            'total' => $this->total,
            'paid_amount' => $this->paid_amount,
            'balance_due' => $this->balance_due,
            'notes' => $this->notes,
        ];
    }
}
