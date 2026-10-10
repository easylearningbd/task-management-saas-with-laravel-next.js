<?php

namespace App\Enums;

/** A project item's status (the green "Active" badge on the Items cards). */
enum ProjectItemStatus: string
{
    case Active = 'active';
    case Inactive = 'inactive';

    public function label(): string
    {
        return match ($this) {
            self::Active => __('Active'),
            self::Inactive => __('Inactive'),
        };
    }
}
