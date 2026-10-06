<?php

namespace App\Support;

/**
 * Display formatting for decimal-string amounts ("1000.00" → "$1,000.00"). Pure string work —
 * the value is never converted to a float.
 */
final class Money
{
    /** Currency symbol until the Currency settings module exists. */
    public const DEFAULT_SYMBOL = '$';

    /** "1000" / "1000.5" / "1000.00" → "$1,000.00". */
    public static function format(string $amount, string $symbol = self::DEFAULT_SYMBOL): string
    {
        $negative = str_starts_with($amount, '-');
        [$int, $dec] = explode('.', bcadd(ltrim($amount, '-'), '0', 2));
        $int = preg_replace('/\B(?=(\d{3})+(?!\d))/', ',', $int);

        return ($negative ? '-' : '').$symbol.$int.'.'.$dec;
    }

    /** "50.00" → "50", "12.50" → "12.5" — for percentages. */
    public static function trimZeros(string $amount): string
    {
        return str_contains($amount, '.') ? rtrim(rtrim($amount, '0'), '.') : $amount;
    }
}
