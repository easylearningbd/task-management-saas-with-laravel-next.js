<?php

namespace App\Enums;

/** A project's status (PRD §6.3, CLAUDE.md §13). */
enum ProjectStatus: string
{
    case Active = 'active';
    case Completed = 'completed';
    case OnHold = 'on_hold';
    case Inactive = 'inactive';

    public function label(): string
    {
        return match ($this) {
            self::Active => __('Active'),
            self::Completed => __('Completed'),
            self::OnHold => __('On Hold'),
            self::Inactive => __('Inactive'),
        };
    }

    /**
     * The lock icon only switches Active ⇄ Inactive. Completed and On Hold are deliberate states
     * set in the edit form, so the toggle refuses them rather than overwriting them.
     */
    public function toggled(): ?self
    {
        return match ($this) {
            self::Active => self::Inactive,
            self::Inactive => self::Active,
            default => null,
        };
    }
}
