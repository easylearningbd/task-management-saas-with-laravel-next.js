<?php

namespace Database\Seeders;

use App\Enums\CouponType;
use App\Models\Coupon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Seeds 12 demo coupons: the ten rows from the Coupons screenshot plus two more, so the list
 * shows a second page at 10 rows per page.
 *
 * Expiry dates are relative to today (the screenshot's dates, taken on 2026-04-14, expressed as
 * offsets), so the demo data never goes stale. One coupon has no expiry, to show "-".
 *
 * Idempotent and additive: matches on code (soft-deleted rows included, so nothing is
 * duplicated), never truncates or deletes, and saves a row only when a value differs — a second
 * run on the same day writes nothing. A run on a later day moves the expiry dates forward.
 *
 * Run: php artisan db:seed --class=CouponSeeder
 */
class CouponSeeder extends Seeder
{
    public function run(): void
    {
        $today = Carbon::today();

        foreach (self::coupons($today) as $attributes) {
            $coupon = Coupon::withTrashed()->firstOrNew(['code' => $attributes['code']]);
            $coupon->forceFill($attributes + ['deleted_at' => null]);

            $action = match (true) {
                ! $coupon->exists => 'created',
                $coupon->isDirty() => 'updated',
                default => 'unchanged',
            };
            if ($action !== 'unchanged') {
                $coupon->save();
            }

            $this->command?->line(sprintf('  %-11s %s', $coupon->code, $action));
        }
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function coupons(Carbon $today): array
    {
        // Month offsets never overflow (Jan 31 + 1 month = Feb 28, not Mar 3).
        $months = fn (int $n): string => $today->copy()->addMonthsNoOverflow($n)->toDateString();
        $days = fn (int $n): string => $today->copy()->addDays($n)->toDateString();
        $percentage = CouponType::Percentage;
        $flat = CouponType::Flat;

        return [
            self::row('WELCOME50', 'WELCOME50', $percentage, '50', null, null, 100, null, $months(6)),
            self::row('SAVE20', 'SAVE20', $percentage, '20', null, null, 200, null, $months(3)),
            self::row('FLAT100', 'FLAT100', $flat, '100', null, null, 50, null, $months(12)),
            self::row('Summer Sale', 'SUMMER20', $percentage, '20', '50', '500', 100, 1, $months(3)),
            self::row('New Customer Discount', 'WELCOME10', $flat, '10', '25', null, null, 1, $months(6)),
            self::row('Flash Sale', 'FLASH15', $percentage, '15', '100', '1000', 50, 2, $days(14)),
            self::row('Auto Generated Coupon', 'AUTO5OFF', $flat, '5', null, null, 200, 3, $months(1), active: false),
            self::row('Black Friday Deal', 'BLACKFRI30', $percentage, '30', '200', '2000', 500, 1, $months(2)),
            self::row('Holiday Special', 'HOLIDAY25', $flat, '25', '75', null, 300, 2, $months(4)),
            self::row('Student Discount', 'STUDENT10', $percentage, '10', '30', '300', null, 5, $months(12)),
            // Two more (not in the screenshot) to fill page 2.
            self::row('Early Bird', 'EARLYBIRD15', $percentage, '15', '20', '250', 150, 1, $months(5)),
            self::row('Loyalty Reward', 'LOYALTY50', $flat, '50', '250', null, null, 2, null),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private static function row(
        string $name,
        string $code,
        CouponType $type,
        string $value,
        ?string $minSpend,
        ?string $maxSpend,
        ?int $usageLimit,
        ?int $perUserLimit,
        ?string $expiryDate,
        bool $active = true,
    ): array {
        return [
            'name' => $name,
            'code' => $code,
            'type' => $type,
            'value' => bcadd($value, '0', 2),
            'min_spend' => $minSpend === null ? null : bcadd($minSpend, '0', 2),
            'max_spend' => $maxSpend === null ? null : bcadd($maxSpend, '0', 2),
            'usage_limit' => $usageLimit,
            'per_user_limit' => $perUserLimit,
            'expiry_date' => $expiryDate,
            'is_active' => $active,
        ];
    }
}
