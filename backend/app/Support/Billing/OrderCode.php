<?php

namespace App\Support\Billing;

use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use LogicException;

/**
 * The next plan order code, `ORD-{YYYY}-{NNNN}` — one sequence per year across the whole
 * platform (codes are unique platform-wide, so the admin list never shows two orders with the
 * same code). Reads the table directly (no Eloquent model, so no tenant scope: the sequence spans
 * every company) and locks the year's latest code row, so two submissions can't take the same
 * number; the unique index on `order_code` is the backstop. Soft-deleted orders keep their code.
 * Must run inside the caller's transaction. The number grows past 9999 if a year needs it.
 */
final class OrderCode
{
    public static function next(?Carbon $at = null): string
    {
        if (DB::transactionLevel() === 0) {
            throw new LogicException('OrderCode::next() must run inside a database transaction.');
        }

        $year = ($at ?? Carbon::now())->format('Y');
        $prefix = "ORD-{$year}-";

        $codes = DB::table('plan_orders')
            ->where('order_code', 'like', $prefix.'%')
            ->lockForUpdate()
            ->pluck('order_code');

        $last = $codes->map(fn (string $code): int => (int) substr($code, strlen($prefix)))->max() ?? 0;

        return $prefix.str_pad((string) ($last + 1), 4, '0', STR_PAD_LEFT);
    }
}
