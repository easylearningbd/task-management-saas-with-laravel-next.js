<?php

namespace App\Http\Resources;

use App\Enums\CouponType;
use App\Models\Coupon;
use App\Support\Money;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Raw values (money as 2-decimal strings, never floats; null limits = unlimited) plus the
 * display-ready fields the table shows, so the UI never recomputes them.
 *
 * @mixin Coupon
 */
class CouponResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'type' => $this->type->value,
            'type_label' => $this->type->label(),
            'value' => $this->value,
            'discount_display' => $this->type === CouponType::Percentage
                ? Money::trimZeros($this->value).'%'
                : Money::format($this->value),
            'min_spend' => $this->min_spend,
            'max_spend' => $this->max_spend,
            'usage_limit' => $this->usage_limit,
            'usage_limit_display' => self::limit($this->usage_limit),
            'per_user_limit' => $this->per_user_limit,
            'per_user_limit_display' => self::limit($this->per_user_limit),
            'expiry_date' => $this->expiry_date?->toDateString(),
            'is_expired' => $this->expiry_date !== null && $this->expiry_date->toDateString() < today()->toDateString(),
            'is_active' => $this->is_active,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }

    private static function limit(?int $limit): string
    {
        return $limit === null ? __('Unlimited') : (string) $limit;
    }
}
