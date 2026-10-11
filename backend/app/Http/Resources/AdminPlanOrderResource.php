<?php

namespace App\Http\Resources;

use App\Models\PlanOrder;
use Illuminate\Http\Request;

/**
 * A plan order as the super admin sees it: the company view plus who reviewed it, with the
 * receipt streamed through the admin route.
 *
 * @mixin PlanOrder
 */
class AdminPlanOrderResource extends PlanOrderResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            'reviewer' => $this->whenLoaded('reviewer', fn () => $this->reviewer ? ['id' => $this->reviewer->id, 'name' => $this->reviewer->name] : null),
        ];
    }

    protected function receiptUrl(): string
    {
        return route('v1.admin.plan-orders.receipt', $this->id);
    }
}
