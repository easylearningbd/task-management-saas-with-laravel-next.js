<?php

namespace App\Http\Requests\Admin;

use App\Models\Coupon;
use Closure;

/**
 * Same rules as creating (PUT sends the whole form); the unique-code rule already ignores the
 * coupon being updated via the `{coupon}` route parameter.
 */
class UpdateCouponRequest extends StoreCouponRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('coupon'));
    }

    /** An already-past expiry date may be kept unchanged; a changed date must not be past. */
    protected function expiryRule(): Closure
    {
        /** @var Coupon $coupon */
        $coupon = $this->route('coupon');
        $stored = $coupon->expiry_date?->toDateString();

        return function (string $attribute, mixed $value, Closure $fail) use ($stored): void {
            if (is_string($value) && $value !== $stored && $value < today()->toDateString()) {
                $fail(__('The expiry date cannot be in the past.'));
            }
        };
    }
}
