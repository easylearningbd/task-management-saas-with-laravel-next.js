<?php

namespace App\Http\Resources;

use App\Enums\PlanDuration;
use App\Models\Plan;
use App\Models\PlanOrder;
use App\Models\Setting;
use App\Services\BillingService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * GET /api/v1/plans — what the company Plans page needs (BillingService::catalog()):
 *  - `plans`: the active plans in `sort_order` (PlanResource), each with `trial_used` (this company
 *    has trialled it) and `trial_available` (it may start that trial now);
 *  - `current`: the company's plan id + duration ("Current" matches BOTH), and its expiry / trial end;
 *  - `pending_order`: the order waiting for review, or null — the page then shows its banner;
 *  - `bank_details`: the global bank-transfer settings the checkout shows (Setting::BANK_KEYS).
 *
 * @property array{plans: Collection<int, Plan>, current: array{plan_id: int|null, duration: PlanDuration|null, expires_at: Carbon|null, trial_ends_at: Carbon|null}, trials: array<int, array{used: bool, available: bool}>, pending: PlanOrder|null} $resource
 *
 * @see BillingService::catalog()
 */
class PlanCatalogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $catalog = $this->resource;

        return [
            'plans' => $catalog['plans']->map(fn (Plan $plan) => [
                ...(new PlanResource($plan))->resolve($request),
                'trial_used' => $catalog['trials'][$plan->id]['used'] ?? false,
                'trial_available' => $catalog['trials'][$plan->id]['available'] ?? false,
            ])->values()->all(),
            'current' => [
                'plan_id' => $catalog['current']['plan_id'],
                'duration' => $catalog['current']['duration']?->value,
                'expires_at' => $catalog['current']['expires_at']?->toIso8601String(),
                'trial_ends_at' => $catalog['current']['trial_ends_at']?->toIso8601String(),
            ],
            'pending_order' => $catalog['pending'] ? (new PlanOrderResource($catalog['pending']))->resolve($request) : null,
            // The checkout's Bank Details panel: the global settings, in display order (null = not set).
            'bank_details' => Setting::globalValues(Setting::BANK_KEYS),
        ];
    }
}
