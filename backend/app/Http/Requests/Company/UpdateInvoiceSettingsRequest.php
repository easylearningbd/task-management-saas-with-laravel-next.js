<?php

namespace App\Http\Requests\Company;

use Illuminate\Foundation\Http\FormRequest;

/**
 * PUT /api/v1/settings/invoice-details — the "Billed From" block (the billing-details modal):
 * company name and email required, phone and address lines optional. Stored as the company's own
 * `settings` rows (Setting::INVOICE_KEYS).
 */
class UpdateInvoiceSettingsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->isCompany();
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'company_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'phone' => ['nullable', 'string', 'max:50'],
            'address' => ['nullable', 'string', 'max:255'],
            'city' => ['nullable', 'string', 'max:100'],
            'state' => ['nullable', 'string', 'max:100'],
            'zip' => ['nullable', 'string', 'max:20'],
            'country' => ['nullable', 'string', 'max:100'],
        ];
    }

    /**
     * @return array<string, ?string>
     */
    public function settings(): array
    {
        return array_map(fn ($value): ?string => $value === null ? null : trim((string) $value), $this->validated());
    }
}
