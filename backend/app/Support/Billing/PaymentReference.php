<?php

namespace App\Support\Billing;

use Illuminate\Support\Facades\DB;
use LogicException;

/**
 * The next invoice payment reference, `PAY{000000}` — one platform-wide sequence (the column is
 * unique). Reads the table directly (no tenant scope) and locks the newest row, so two payments
 * can't take the same reference; the unique index is the backstop (e.g. two first-ever payments). Must run inside the
 * caller's transaction. Grows past six digits if it ever needs to.
 */
final class PaymentReference
{
    public static function next(): string
    {
        if (DB::transactionLevel() === 0) {
            throw new LogicException('PaymentReference::next() must run inside a database transaction.');
        }

        // References grow with the row id, so the newest row holds the highest one.
        $latest = DB::table('invoice_payments')->orderByDesc('id')->lockForUpdate()->value('reference');
        $last = is_string($latest) ? (int) substr($latest, 3) : 0;

        return 'PAY'.str_pad((string) ($last + 1), 6, '0', STR_PAD_LEFT);
    }
}
