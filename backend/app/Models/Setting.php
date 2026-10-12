<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A key/value setting (PRD §10). `company_id` null = global (platform-wide, edited by the super
 * admin — e.g. the bank-transfer details); otherwise that company's own value. Not
 * BelongsToCompany: global rows have no company, so reads name their scope explicitly
 * (`global()` / `forCompany()`), and company code only ever reads global rows through
 * `globalValues()`, never another company's.
 *
 * @property int $id
 * @property int|null $company_id
 * @property string $key
 * @property string|null $value
 */
class Setting extends Model
{
    /** The global keys the checkout's Bank Details panel shows, in display order. */
    public const BANK_KEYS = ['bank_name', 'bank_account_name', 'bank_account_number', 'bank_branch', 'bank_swift', 'bank_instructions'];

    /** A company's own keys for its invoices' "Billed From" block, in display order. */
    public const INVOICE_KEYS = ['invoice_company_name', 'invoice_email', 'invoice_phone', 'invoice_address', 'invoice_city', 'invoice_state', 'invoice_zip', 'invoice_country'];

    protected $fillable = ['key', 'value'];

    public function company(): BelongsTo
    {
        return $this->belongsTo(Company::class, 'company_id');
    }

    /**
     * @param  Builder<Setting>  $query
     */
    public function scopeGlobal(Builder $query): void
    {
        $query->whereNull('settings.company_id');
    }

    /**
     * @param  Builder<Setting>  $query
     */
    public function scopeForCompany(Builder $query, int $companyId): void
    {
        $query->where('settings.company_id', $companyId);
    }

    /**
     * Global values for `$keys`, in that order; a missing key reads null.
     *
     * @param  list<string>  $keys
     * @return array<string, string|null>
     */
    public static function globalValues(array $keys): array
    {
        $stored = self::query()->global()->whereIn('key', $keys)->pluck('value', 'key');

        return array_combine($keys, array_map(fn (string $key): ?string => $stored[$key] ?? null, $keys));
    }

    /**
     * A company's own values for `$keys`, in that order; a missing key reads null.
     *
     * @param  list<string>  $keys
     * @return array<string, string|null>
     */
    public static function companyValues(int $companyId, array $keys): array
    {
        $stored = self::query()->forCompany($companyId)->whereIn('key', $keys)->pluck('value', 'key');

        return array_combine($keys, array_map(fn (string $key): ?string => $stored[$key] ?? null, $keys));
    }

    /** Set one of a company's values (unique per company and key). */
    public static function putForCompany(int $companyId, string $key, ?string $value): self
    {
        $setting = self::query()->forCompany($companyId)->where('key', $key)->first() ?? (new self(['key' => $key]))->forceFill(['company_id' => $companyId]);
        $setting->value = $value;
        $setting->save();

        return $setting;
    }

    /** Set a global value (one row per key: NULL company ids are not unique in MySQL's index). */
    public static function putGlobal(string $key, ?string $value): self
    {
        $setting = self::query()->global()->where('key', $key)->first() ?? new self(['key' => $key]);
        $setting->value = $value;
        $setting->save();

        return $setting;
    }
}
