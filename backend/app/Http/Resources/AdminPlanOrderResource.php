<?php

namespace App\Http\Resources;

use App\Models\PlanOrder;
use App\Services\CompanyService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

/**
 * A plan order as the super admin sees it: the company view plus who reviewed it, with the
 * receipt streamed through the admin route. A PENDING order also carries `approval` — what
 * approving it now would set: `expires_at` from CompanyService::expiryForPlan(), the very
 * function PlanOrderService::approve() uses (null = a $0 plan, which never expires). Null once
 * the order has been reviewed.
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
            'approval' => $this->whenLoaded('plan', fn () => $this->isPending() && $this->plan ? [
                'expires_at' => CompanyService::expiryForPlan($this->plan, $this->duration, Carbon::now())?->toIso8601String(),
            ] : null),
        ];
    }

    protected function receiptUrl(): string
    {
        return route('v1.admin.plan-orders.receipt', $this->id);
    }
}
