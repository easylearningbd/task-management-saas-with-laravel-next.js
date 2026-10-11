<?php

namespace App\Enums;

/** A plan order's review state (CLAUDE.md §13: Pending, Approved, Rejected). */
enum PlanOrderStatus: string
{
    case Pending = 'pending';
    case Approved = 'approved';
    case Rejected = 'rejected';

    public function label(): string
    {
        return match ($this) {
            self::Pending => __('Pending'),
            self::Approved => __('Approved'),
            self::Rejected => __('Rejected'),
        };
    }
}
