<?php

namespace App\Enums;

/**
 * An invoice's state (CLAUDE.md §13: Draft, Sent, Partial, Paid). Draft / Sent are set by the
 * company (Sent by Send Invoice, later); Partial / Paid follow from the payments
 * (PaymentService). Only Draft and Sent invoices can be edited or deleted.
 */
enum InvoiceStatus: string
{
    case Draft = 'draft';
    case Sent = 'sent';
    case Partial = 'partial';
    case Paid = 'paid';

    public function label(): string
    {
        return match ($this) {
            self::Draft => __('Draft'),
            self::Sent => __('Sent'),
            self::Partial => __('Partial'),
            self::Paid => __('Paid'),
        };
    }

    /** Draft and Sent invoices can be edited and deleted; Partial and Paid are view-only. */
    public function isEditable(): bool
    {
        return $this === self::Draft || $this === self::Sent;
    }
}
