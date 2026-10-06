<?php

namespace App\Services;

use App\Enums\CouponType;
use App\Models\Coupon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * Every coupon business rule (task spec "Business rules"; CLAUDE.md §7):
 *  1. Codes are trimmed, uppercase and unique. Soft-deleted coupons keep their code reserved,
 *     like plan names (the unique index covers every row).
 *  2. Auto Generate: readable 8–10 character codes without O/0/I/1. When the request says the
 *     code was auto-generated, a collision silently gets a fresh code instead of failing.
 *  3. Percentage: 0 < value <= 100. Flat: value > 0.
 *  4. Spends are optional; when both are given, max_spend >= min_spend.
 *  5. Empty limits are stored as null (= unlimited); given limits are >= 1.
 *  6. Expiry is optional. Create: today or later. Update: an unchanged date may already be in
 *     the past; a changed date must be today or later. "Today" is the app timezone (UTC).
 *  7. Money is handled as decimal strings with bcmath — never floats.
 *  8. Delete is a soft delete.
 * Rule violations throw ValidationException (422) keyed by the form field.
 */
class CouponService
{
    /** Code alphabet: uppercase letters and digits without the look-alikes O, 0, I and 1. */
    public const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    public const CODE_MIN_LENGTH = 8;

    public const CODE_MAX_LENGTH = 10;

    /** Attempts per length before trying a longer code. */
    private const ATTEMPTS_PER_LENGTH = 5;

    /** Allowed codes after normalising: letters, digits, "-" and "_", at most 50 (the column size). */
    public const CODE_PATTERN = '/^[A-Z0-9_-]{1,50}$/';

    /** Upper bound of the UNSIGNED INT limit columns. */
    public const LIMIT_MAX = 4294967295;

    /** Upper bound of DECIMAL(15,2). */
    private const MONEY_MAX = '9999999999999.99';

    /**
     * The admin list, filtered (sorting and pagination are applied by ListQuery).
     *
     * @param  array{search?: ?string, type?: ?string, status?: ?string, expiry_from?: ?string, expiry_to?: ?string}  $filters
     * @return Builder<Coupon>
     */
    public function query(array $filters): Builder
    {
        return Coupon::query()
            ->search($filters['search'] ?? null)
            ->when($filters['type'] ?? null, fn (Builder $q, string $type) => $q->ofType($type))
            ->when($filters['status'] ?? null, fn (Builder $q, string $status) => $q->active($status === 'active'))
            ->when($filters['expiry_from'] ?? null, fn (Builder $q, string $from) => $q->whereDate('expiry_date', '>=', $from))
            ->when($filters['expiry_to'] ?? null, fn (Builder $q, string $to) => $q->whereDate('expiry_date', '<=', $to));
    }

    /**
     * @param  array<string, mixed>  $data  validated input; `code_mode` is "manual" (default) or "auto"
     */
    public function create(array $data): Coupon
    {
        $coupon = new Coupon;
        $this->apply($coupon, $data);

        return $this->saveWithUniqueCode($coupon, $this->isAuto($data));
    }

    /**
     * @param  array<string, mixed>  $data  validated input; keys left out keep their current value
     */
    public function update(Coupon $coupon, array $data): Coupon
    {
        $this->apply($coupon, $data);

        return $this->saveWithUniqueCode($coupon, $this->isAuto($data));
    }

    /** Flip `is_active`. */
    public function toggleStatus(Coupon $coupon): Coupon
    {
        $coupon->is_active = ! $coupon->is_active;
        $coupon->save();

        return $coupon;
    }

    /** Soft delete. The code stays reserved. */
    public function delete(Coupon $coupon): void
    {
        $coupon->delete();
    }

    /**
     * A fresh code no coupon (deleted ones included) uses: 8 characters, growing to 10 only if
     * repeated collisions make that necessary.
     */
    public function generateUniqueCode(): string
    {
        for ($length = self::CODE_MIN_LENGTH; $length <= self::CODE_MAX_LENGTH; $length++) {
            for ($attempt = 0; $attempt < self::ATTEMPTS_PER_LENGTH; $attempt++) {
                $code = self::randomCode($length);
                if (! $this->codeTaken($code)) {
                    return $code;
                }
            }
        }

        throw new RuntimeException('Could not generate a unique coupon code.');
    }

    /** A random code of the given length from CODE_ALPHABET (cryptographically secure). */
    public static function randomCode(int $length = self::CODE_MIN_LENGTH): string
    {
        $max = strlen(self::CODE_ALPHABET) - 1;
        $code = '';
        for ($i = 0; $i < $length; $i++) {
            $code .= self::CODE_ALPHABET[random_int(0, $max)];
        }

        return $code;
    }

    /** True when any coupon other than `$ignore` (deleted ones included) has this code. */
    public function codeTaken(string $code, ?Coupon $ignore = null): bool
    {
        return Coupon::withTrashed()
            ->where('code', Coupon::normalizeCode($code))
            ->when($ignore?->exists, fn ($q) => $q->whereKeyNot($ignore->getKey()))
            ->exists();
    }

    /**
     * Copy validated input onto the model, normalise it and check every rule against the
     * resulting values (so changing only `type` still re-checks the current `value`).
     *
     * @param  array<string, mixed>  $data
     */
    private function apply(Coupon $coupon, array $data): void
    {
        $isAuto = $this->isAuto($data);
        $errors = [];

        foreach (['name', 'is_active'] as $key) {
            if (array_key_exists($key, $data)) {
                $coupon->{$key} = is_string($data[$key]) ? trim($data[$key]) : $data[$key];
            }
        }

        // Code — required, except that Auto Generate may leave it to the server.
        if (array_key_exists('code', $data) || ! $coupon->exists) {
            $code = Coupon::normalizeCode(self::blankToNull($data['code'] ?? null));
            if ($code === null && $isAuto) {
                $code = $this->generateUniqueCode();
            }
            if ($code === null) {
                $errors['code'] = __('The coupon code is required.');
            } elseif (! preg_match(self::CODE_PATTERN, $code)) {
                $errors['code'] = __('Use up to 50 letters, digits, hyphens or underscores.');
            } elseif (! $isAuto && $this->codeTaken($code, $coupon)) {
                $errors['code'] = __('This coupon code is already in use.');
            }
            $coupon->code = $code;
        }

        if (array_key_exists('type', $data)) {
            $coupon->type = $data['type'] instanceof CouponType ? $data['type'] : CouponType::tryFrom((string) $data['type']);
        }
        if (! $coupon->type instanceof CouponType) {
            $errors['type'] = __('Select a discount type.');
        }

        // Money fields: 2-decimal strings.
        foreach (['value', 'min_spend', 'max_spend'] as $key) {
            if (! array_key_exists($key, $data)) {
                continue;
            }
            $raw = self::blankToNull($data[$key]);
            $money = $raw === null ? null : self::money($raw);
            if ($raw !== null && $money === null) {
                $errors[$key] = __('Enter an amount with at most 2 decimal places.');
            }
            $coupon->{$key} = $money;
        }

        $value = $coupon->value;
        if ($value === null) {
            $errors['value'] ??= __('The discount value is required.');
        } elseif (! isset($errors['value'])) {
            if (bccomp($value, '0', 2) <= 0) {
                $errors['value'] = __('The discount value must be greater than 0.');
            } elseif ($coupon->type === CouponType::Percentage && bccomp($value, '100', 2) > 0) {
                $errors['value'] = __('A percentage discount cannot be more than 100%.');
            }
        }

        $min = $coupon->min_spend;
        $max = $coupon->max_spend;
        if ($min !== null && $max !== null && ! isset($errors['min_spend']) && ! isset($errors['max_spend'])
            && bccomp($max, $min, 2) < 0) {
            $errors['max_spend'] = __('The maximum spend must be greater than or equal to the minimum spend.');
        }

        // Limits: empty = unlimited (null); otherwise a whole number >= 1.
        foreach (['usage_limit', 'per_user_limit'] as $key) {
            if (! array_key_exists($key, $data)) {
                continue;
            }
            $raw = self::blankToNull($data[$key]);
            if ($raw === null) {
                $coupon->{$key} = null;
            } elseif (filter_var($raw, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => self::LIMIT_MAX]]) === false) {
                $errors[$key] = __('Leave empty for unlimited, or enter a whole number of at least 1.');
            } else {
                $coupon->{$key} = (int) $raw;
            }
        }

        // Expiry: a new or changed date must not be in the past; an unchanged one may be.
        if (array_key_exists('expiry_date', $data)) {
            $raw = self::blankToNull($data['expiry_date']);
            $date = $raw === null ? null : self::date($raw);
            if ($raw !== null && $date === null) {
                $errors['expiry_date'] = __('Enter a valid date.');
            }
            $stored = $coupon->exists ? $coupon->getOriginal('expiry_date')?->toDateString() : null;
            if ($date !== null && $date !== $stored && $date < Carbon::today()->toDateString()) {
                $errors['expiry_date'] = __('The expiry date cannot be in the past.');
            }
            $coupon->expiry_date = $date;
        }

        if ($errors !== []) {
            throw ValidationException::withMessages($errors);
        }
    }

    /**
     * Save; when the code was auto-generated and another request took it in the meantime, the
     * unique index rejects the insert and a fresh code is tried instead. A manual code that
     * loses the same race becomes a normal 422 under `code`.
     */
    private function saveWithUniqueCode(Coupon $coupon, bool $isAuto): Coupon
    {
        for ($attempt = 0; ; $attempt++) {
            if ($isAuto && $this->codeTaken($coupon->code, $coupon)) {
                $coupon->code = $this->generateUniqueCode();
            }

            try {
                DB::transaction(fn () => $coupon->save());

                return $coupon->refresh();
            } catch (UniqueConstraintViolationException) {
                if (! $isAuto || $attempt >= 2) {
                    throw ValidationException::withMessages([
                        'code' => __('This coupon code is already in use.'),
                    ]);
                }
                $coupon->code = $this->generateUniqueCode();
            }
        }
    }

    /** @param  array<string, mixed>  $data */
    private function isAuto(array $data): bool
    {
        return ($data['code_mode'] ?? 'manual') === 'auto';
    }

    /** A Y-m-d date string, or null when the input is not a real calendar date. */
    private static function date(mixed $value): ?string
    {
        if (! is_string($value) || ! preg_match('/^\d{4}-\d{2}-\d{2}$/', $value)) {
            return null;
        }
        $date = Carbon::createFromFormat('!Y-m-d', $value);

        return $date !== null && $date->format('Y-m-d') === $value ? $value : null;
    }

    private static function blankToNull(mixed $value): mixed
    {
        return is_string($value) && trim($value) === '' ? null : $value;
    }

    /** A non-negative amount with at most 2 decimals as a 2-decimal string; null if malformed. */
    private static function money(mixed $value): ?string
    {
        $value = is_string($value) ? trim($value) : $value;
        if (is_int($value) || is_float($value)) {
            $value = (string) $value; // JSON numbers like 19.99: shortest round-trip form, never rounded
        }
        if (! is_string($value) || ! preg_match('/^\d{1,13}(\.\d{1,2})?$/', $value)) {
            return null;
        }
        $money = bcadd($value, '0', 2);

        return bccomp($money, self::MONEY_MAX, 2) <= 0 ? $money : null;
    }
}
