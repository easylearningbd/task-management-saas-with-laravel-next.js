<?php

namespace App\Enums;

/** Where an invoice line comes from: one of the project's items, or one of its tasks. */
enum InvoiceItemType: string
{
    case Item = 'item';
    case Task = 'task';

    public function label(): string
    {
        return match ($this) {
            self::Item => __('Item'),
            self::Task => __('Task'),
        };
    }
}
