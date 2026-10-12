<?php

namespace App\Enums;

/**
 * An invoice payment's state. A recorded payment is money received — Paid. The column is a string
 * so later states (e.g. a pending card payment) can be added without a migration; only Paid
 * payments count towards the invoice's paid amount.
 */
enum PaymentStatus: string
{
    case Paid = 'paid';

    public function label(): string
    {
        return match ($this) {
            self::Paid => __('Paid'),
        };
    }
}
