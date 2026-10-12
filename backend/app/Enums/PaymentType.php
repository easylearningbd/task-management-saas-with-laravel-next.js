<?php

namespace App\Enums;

/** How an invoice payment was made — shown with its human label ("Credit Card"), never the raw value. */
enum PaymentType: string
{
    case CreditCard = 'credit_card';
    case BankTransfer = 'bank_transfer';
    case Cash = 'cash';
    case Cheque = 'cheque';
    case Other = 'other';

    public function label(): string
    {
        return match ($this) {
            self::CreditCard => __('Credit Card'),
            self::BankTransfer => __('Bank Transfer'),
            self::Cash => __('Cash'),
            self::Cheque => __('Cheque'),
            self::Other => __('Other'),
        };
    }
}
