<?php

namespace App\Http\Resources;

use App\Enums\PlanDuration;
use App\Enums\UserStatus;
use App\Models\Company;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A company row: raw fields plus display-ready ones (`status_label`, `avatar_url`,
 * `plan_duration_label`). Never the password or the remember token. Dates are ISO 8601 (UTC).
 *
 * @mixin Company
 */
class CompanyResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'avatar_url' => $this->avatar_url,
            'status' => $this->status->value,
            'status_label' => match ($this->status) {
                UserStatus::Active => __('Active'),
                UserStatus::Inactive => __('Inactive'),
            },
            'is_login_enabled' => $this->is_login_enabled,
            'email_verified_at' => $this->email_verified_at?->toIso8601String(),
            'plan' => $this->whenLoaded('plan', fn () => $this->plan ? ['id' => $this->plan->id, 'name' => $this->plan->name] : null),
            'plan_duration' => $this->plan_duration?->value,
            'plan_duration_label' => match ($this->plan_duration) {
                PlanDuration::Monthly => __('Monthly'),
                PlanDuration::Yearly => __('Yearly'),
                null => null,
            },
            'plan_expires_at' => $this->plan_expires_at?->toIso8601String(),
            'trial_ends_at' => $this->trial_ends_at?->toIso8601String(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
