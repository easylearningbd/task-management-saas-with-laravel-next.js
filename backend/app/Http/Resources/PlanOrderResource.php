<?php

namespace App\Http\Resources;

use App\Models\PlanOrder;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A plan order as the company sees it (the Plan Requests table and its details modal) —
 * display-ready: labels for type, duration, status and payment method; money as 2-decimal
 * strings; the company (avatar, name, email) for the table's Company column. The receipt is
 * never a storage path: `receipt_url` is the authorised route that streams it (null when there
 * is none). Who reviewed it stays internal — the company sees when, and why if rejected.
 *
 * @mixin PlanOrder
 */
class PlanOrderResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'order_code' => $this->order_code,
            'type' => $this->type->value,
            'type_label' => $this->type->label(),
            'plan' => $this->whenLoaded('plan', fn () => $this->plan ? ['id' => $this->plan->id, 'name' => $this->plan->name] : null),
            'company' => $this->whenLoaded('company', fn () => $this->company ? [
                'id' => $this->company->id,
                'name' => $this->company->name,
                'email' => $this->company->email,
                'avatar_url' => $this->company->avatar_url,
            ] : null),
            'duration' => $this->duration->value,
            'duration_label' => $this->duration->label(),
            'price' => $this->price,
            'discount' => $this->discount,
            'final_amount' => $this->final_amount,
            'payment_method' => $this->payment_method?->value,
            'payment_method_label' => $this->payment_method?->label(),
            'payment_reference' => $this->payment_reference,
            'has_receipt' => $this->receipt_path !== null,
            'receipt_name' => $this->receipt_name,
            'receipt_url' => $this->receipt_path !== null ? $this->receiptUrl() : null,
            'notes' => $this->notes,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'reviewed_at' => $this->reviewed_at?->toIso8601String(),
            'rejection_reason' => $this->rejection_reason,
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }

    protected function receiptUrl(): string
    {
        return route('v1.plan-orders.receipt', $this->id);
    }
}
