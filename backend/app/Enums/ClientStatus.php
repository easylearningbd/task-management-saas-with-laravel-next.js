<?php

namespace App\Enums;

/** A client's status (PRD §6.7). */
enum ClientStatus: string
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

    public function toggled(): self
    {
        return $this === self::Active ? self::Inactive : self::Active;
    }
}
