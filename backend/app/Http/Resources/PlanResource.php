<?php

namespace App\Http\Resources;

use App\Models\Plan;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Money and storage are 2-decimal strings ("19.99") — exact, never floats. `yearly_price` is
 * the stored value (computed server-side when it was left empty), so the UI never does money
 * math.
 *
 * @mixin Plan
 */
class PlanResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'monthly_price' => $this->monthly_price,
            'yearly_price' => $this->yearly_price,
            'max_projects' => $this->max_projects,
            'is_unlimited' => $this->is_unlimited,
            'storage_limit_gb' => $this->storage_limit_gb,
            'trial_enabled' => $this->trial_enabled,
            'trial_days' => $this->trial_days,
            'ai_integration' => $this->ai_integration,
            'is_active' => $this->is_active,
            'is_default' => $this->is_default,
            'is_recommended' => $this->is_recommended,
            'sort_order' => $this->sort_order,
            'subscribers_count' => $this->whenCounted('subscribers', fn () => (int) $this->subscribers_count, 0),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
