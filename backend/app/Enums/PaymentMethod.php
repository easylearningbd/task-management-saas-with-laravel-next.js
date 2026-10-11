<?php

namespace App\Enums;

/**
 * How a plan order is paid:
 *  - bank_transfer: the checkout's working method — a reference and a receipt, approved by an admin;
 *  - stripe:        shown at checkout but disabled — never accepted by the API (not integrated);
 *  - manual:        a Request Plan order (no payment taken in the app);
 *  - free:          a $0 plan or a trial — nothing to pay, applied at once.
 */
enum PaymentMethod: string
{
    case BankTransfer = 'bank_transfer';
    case Stripe = 'stripe';
    case Manual = 'manual';
    case Free = 'free';

    public function label(): string
    {
        return match ($this) {
            self::BankTransfer => __('Bank Transfer'),
            self::Stripe => __('Stripe'),
            self::Manual => __('Manual'),
            self::Free => __('Free'),
        };
    }
}
