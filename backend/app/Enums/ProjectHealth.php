<?php

namespace App\Enums;

/**
 * Project Health (PRD §6.3): the overall progress, banded — Low < 40%, Medium 40–74%,
 * High ≥ 75%. Overall progress is task completion (tasks in a done stage ÷ the project's tasks),
 * so a project without tasks reads 0% / Low.
 */
enum ProjectHealth: string
{
    case Low = 'low';
    case Medium = 'medium';
    case High = 'high';

    public static function fromProgress(int $percent): self
    {
        return match (true) {
            $percent >= 75 => self::High,
            $percent >= 40 => self::Medium,
            default => self::Low,
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::Low => __('Low'),
            self::Medium => __('Medium'),
            self::High => __('High'),
        };
    }
}
