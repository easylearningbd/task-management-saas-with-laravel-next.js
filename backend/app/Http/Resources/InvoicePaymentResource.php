<?php

namespace App\Http\Resources;

use App\Models\InvoicePayment;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One row of an invoice's Payment History: date (Y-m-d), amount (always positive), the payment
 * type with its human label ("Bank Transfer" — never the raw value), reference, status with its
 * label, description. `receipt_url` is null — receipts aren't uploaded yet (the column shows "—").
 *
 * @mixin InvoicePayment
 */
class InvoicePaymentResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'invoice_id' => $this->invoice_id,
            'payment_date' => $this->payment_date->toDateString(),
            'amount' => $this->amount,
            'payment_type' => $this->payment_type->value,
            'payment_type_label' => $this->payment_type->label(),
            'reference' => $this->reference,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'receipt_url' => null,
            'description' => $this->description,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
