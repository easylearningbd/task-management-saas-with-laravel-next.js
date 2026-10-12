<?php

namespace App\Services;

use App\Models\Setting;

/**
 * A company's invoice "Billed From" details — its own `settings` rows (Setting::INVOICE_KEYS),
 * seeded by CompanySetupService and edited from the invoice page's billing-details modal until the
 * Settings page exists. Exposed with short field names (`company_name`, `email`, …); missing keys
 * read null.
 */
class InvoiceSettingsService
{
    /** field → settings key */
    public const FIELDS = [
        'company_name' => 'invoice_company_name',
        'email' => 'invoice_email',
        'phone' => 'invoice_phone',
        'address' => 'invoice_address',
        'city' => 'invoice_city',
        'state' => 'invoice_state',
        'zip' => 'invoice_zip',
        'country' => 'invoice_country',
    ];

    /**
     * @return array<string, string|null>
     */
    public function get(int $companyId): array
    {
        $values = Setting::companyValues($companyId, array_values(self::FIELDS));

        return array_map(fn (string $key): ?string => $values[$key], self::FIELDS);
    }

    /**
     * @param  array<string, string|null>  $fields  validated fields (empty strings stored as null)
     * @return array<string, string|null>
     */
    public function update(int $companyId, array $fields): array
    {
        foreach (self::FIELDS as $field => $key) {
            if (array_key_exists($field, $fields)) {
                $value = $fields[$field];
                Setting::putForCompany($companyId, $key, $value === '' ? null : $value);
            }
        }

        return $this->get($companyId);
    }
}
