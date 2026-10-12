<?php

namespace App\Http\Resources;

use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\InvoiceTax;
use Illuminate\Http\Request;

/**
 * One invoice in full (the details page and the edit form): the list row plus the client's
 * contact block, the project (name, description), the lines (with their item / task link for the
 * form), the applied taxes (snapshots) and their combined rate (the summary's "Tax (n%)"), every
 * amount (2-decimal strings, server-computed), the notes, the share token (the page builds
 * /i/{token}) and, when loaded, the payments.
 *
 * @mixin Invoice
 */
class InvoiceResource extends InvoiceListResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            'client' => $this->whenLoaded('client', fn () => $this->client ? [
                'id' => $this->client->id,
                'name' => $this->client->name,
                'email' => $this->client->email,
                'phone' => $this->client->phone,
                'address' => $this->client->address,
                'company_name' => $this->client->company_name,
                'initials' => $this->client->initials,
            ] : null),
            'project' => $this->whenLoaded('project', fn () => $this->project ? [
                'id' => $this->project->id,
                'name' => $this->project->name,
                'description' => $this->project->description,
            ] : null),
            'subtotal' => $this->subtotal,
            'discount_amount' => $this->discount_amount,
            'tax_amount' => $this->tax_amount,
            'tax_rate' => $this->whenLoaded('taxes', fn () => $this->taxes->reduce(fn (string $sum, InvoiceTax $tax): string => bcadd($sum, (string) $tax->rate, 2), '0.00')),
            'notes' => $this->notes,
            'public_token' => $this->public_token,
            'sent_at' => $this->sent_at?->toIso8601String(),
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn (InvoiceItem $item): array => [
                'id' => $item->id,
                'type' => $item->type->value,
                'project_item_id' => $item->project_item_id,
                'task_id' => $item->task_id,
                'description' => $item->description,
                'quantity' => $item->quantity,
                'price' => $item->price,
                'total' => $item->total,
            ])->all()),
            'taxes' => $this->whenLoaded('taxes', fn () => $this->taxes->map(fn (InvoiceTax $tax): array => [
                'tax_id' => $tax->tax_id,
                'name' => $tax->name,
                'rate' => $tax->rate,
                'amount' => $tax->amount,
            ])->all()),
            'payments' => InvoicePaymentResource::collection($this->whenLoaded('payments')),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
