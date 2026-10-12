<?php

namespace App\Support\Billing;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use LogicException;

/**
 * The next invoice number for one company, `INV-{YYYY}-{NNNN}` (CLAUDE.md §8) — a sequence per
 * company per year, so two companies can both hold INV-2026-0001 (the unique index is
 * (company_id, invoice_number)). Reads the table directly (deleted invoices keep their number, so
 * a number is never reused) and locks the company's numbers for that year, so two saves can't
 * take the same one. Must run inside the caller's transaction. Grows past 9999 if a year needs it.
 */
final class InvoiceNumber
{
    public static function next(int $companyId, ?Carbon $at = null): string
    {
        if (DB::transactionLevel() === 0) {
            throw new LogicException('InvoiceNumber::next() must run inside a database transaction.');
        }

        $prefix = 'INV-'.($at ?? Carbon::now())->format('Y').'-';

        $numbers = DB::table('invoices')
            ->where('company_id', $companyId)
            ->where('invoice_number', 'like', $prefix.'%')
            ->lockForUpdate()
            ->pluck('invoice_number');

        $last = $numbers->map(fn (string $number): int => (int) substr($number, strlen($prefix)))->max() ?? 0;

        return $prefix.str_pad((string) ($last + 1), 4, '0', STR_PAD_LEFT);
    }
}
