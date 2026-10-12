<?php

namespace App\Http\Resources;

use App\Models\Invoice;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One row of the Invoices list (PAGE SPEC A): number, client (initials avatar, name, email),
 * project, the two dates (Y-m-d — calendar dates, no time zone), total and balance (2-decimal
 * strings), status with its label, whether it's overdue (past due with money owed — the red due
 * date) and whether it can still be edited / deleted (Draft and Sent — the row's pencil and trash).
 *
 * @mixin Invoice
 */
class InvoiceListResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'invoice_number' => $this->invoice_number,
            'client' => $this->whenLoaded('client', fn () => $this->client ? [
                'id' => $this->client->id,
                'name' => $this->client->name,
                'email' => $this->client->email,
                'initials' => $this->client->initials,
            ] : null),
            'project' => $this->whenLoaded('project', fn () => $this->project ? ['id' => $this->project->id, 'name' => $this->project->name] : null),
            'invoice_date' => $this->invoice_date->toDateString(),
            'due_date' => $this->due_date->toDateString(),
            'total' => $this->total,
            'paid_amount' => $this->paid_amount,
            'balance_due' => $this->balance_due,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'is_overdue' => $this->isOverdue(),
            'can_edit' => $this->isEditable(),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
