<?php

namespace App\Enums;

/**
 * How a project item is priced (the Add Item modal's Unit). `design/` defines none; the Items
 * screenshot shows "hours" and "package", and Phase 0 settled the rest of the list.
 */
enum ProjectItemUnit: string
{
    case Hours = 'hours';
    case Package = 'package';
    case Piece = 'piece';
    case Day = 'day';
    case Month = 'month';
    case Fixed = 'fixed';

    public function label(): string
    {
        return match ($this) {
            self::Hours => __('hours'),
            self::Package => __('package'),
            self::Piece => __('piece'),
            self::Day => __('day'),
            self::Month => __('month'),
            self::Fixed => __('fixed'),
        };
    }
}
