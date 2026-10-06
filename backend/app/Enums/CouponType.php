<?php

namespace App\Enums;

enum CouponType: string
{
    case Percentage = 'percentage';
    case Flat = 'flat';

    /** Display name, so the UI never maps the raw value itself. */
    public function label(): string
    {
        return match ($this) {
            self::Percentage => __('Percentage'),
            self::Flat => __('Flat Amount'),
        };
    }
}
