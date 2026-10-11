<?php

namespace App\Enums;

/** A task's priority (PRD §6.4, CLAUDE.md §13). The stat cards group them: High Priority = High +
 *  Urgent, Low Priority = Low + Medium. */
enum TaskPriority: string
{
    case Low = 'low';
    case Medium = 'medium';
    case High = 'high';
    case Urgent = 'urgent';

    public function label(): string
    {
        return match ($this) {
            self::Low => __('Low'),
            self::Medium => __('Medium'),
            self::High => __('High'),
            self::Urgent => __('Urgent'),
        };
    }

    /** @return list<self> the "High Priority" stat card's priorities */
    public static function highGroup(): array
    {
        return [self::High, self::Urgent];
    }

    /** @return list<self> the "Low Priority" stat card's priorities */
    public static function lowGroup(): array
    {
        return [self::Low, self::Medium];
    }
}
