<?php

namespace App\Http\Requests\Company;

use App\Enums\ClientStatus;
use App\Models\Client;
use App\Support\Tenancy\Tenancy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Unique;

/**
 * POST /api/v1/clients — the Add Client form (PRD §6.7 as built: Phone, Company and Address are
 * required; Website, Status and Notes optional). `company_id` is never read from the request:
 * BelongsToCompany sets it. The same rules and wording live in the frontend schema
 * (features/clients/schema.ts, messages/en.json → clients.validation).
 */
class StoreClientRequest extends FormRequest
{
    public const NAME_MAX = 255;

    public const EMAIL_MAX = 255;

    public const PHONE_MAX = 50;

    public const COMPANY_MAX = 255;

    public const ADDRESS_MAX = 1000;

    public const WEBSITE_MAX = 255;

    public const NOTES_MAX = 5000;

    public function authorize(): bool
    {
        return $this->user()->can('create', Client::class);
    }

    protected function prepareForValidation(): void
    {
        $trimmed = [];
        foreach (['name', 'email', 'phone', 'company_name', 'address', 'website', 'notes'] as $field) {
            if (is_string($this->input($field))) {
                $trimmed[$field] = trim($this->input($field));
            }
        }
        if (isset($trimmed['email'])) {
            $trimmed['email'] = Str::lower($trimmed['email']);
        }
        // An emptied optional field is "no value".
        foreach (['website', 'notes'] as $field) {
            if (($trimmed[$field] ?? null) === '') {
                $trimmed[$field] = null;
            }
        }

        $this->merge($trimmed);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:'.self::NAME_MAX],
            'email' => ['required', 'string', 'email', 'max:'.self::EMAIL_MAX, $this->uniqueEmail()],
            'phone' => ['required', 'string', 'max:'.self::PHONE_MAX],
            'company_name' => ['required', 'string', 'max:'.self::COMPANY_MAX],
            'address' => ['required', 'string', 'max:'.self::ADDRESS_MAX],
            'website' => ['nullable', 'string', 'url:http,https', 'max:'.self::WEBSITE_MAX],
            'status' => ['sometimes', Rule::enum(ClientStatus::class)],
            'notes' => ['nullable', 'string', 'max:'.self::NOTES_MAX],
        ];
    }

    /**
     * Unique within the current company only — another company may have a client with the same
     * address. Soft-deleted clients count too: the (company_id, email) index covers them.
     */
    protected function uniqueEmail(): Unique
    {
        return Rule::unique('clients', 'email')->where('company_id', Tenancy::instance()->requireCompanyId());
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => __('The client name is required.'),
            'name.max' => __('The client name may not be longer than :max characters.'),
            'email.required' => __('The email address is required.'),
            'email.email' => __('Enter a valid email address.'),
            'email.max' => __('The email address may not be longer than :max characters.'),
            'email.unique' => __('A client with this email address already exists.'),
            'phone.required' => __('The phone number is required.'),
            'phone.max' => __('The phone number may not be longer than :max characters.'),
            'company_name.required' => __('The company is required.'),
            'company_name.max' => __('The company may not be longer than :max characters.'),
            'address.required' => __('The address is required.'),
            'address.max' => __('The address may not be longer than :max characters.'),
            'website.url' => __('Enter a valid URL starting with http:// or https://.'),
            'website.max' => __('The website may not be longer than :max characters.'),
            'notes.max' => __('The notes may not be longer than :max characters.'),
        ];
    }

    /**
     * Only the form's fields — anything else in the body (company_id, id, …) is dropped.
     *
     * @return array<string, mixed>
     */
    public function clientData(): array
    {
        return $this->safe()->only(['name', 'email', 'phone', 'company_name', 'address', 'website', 'status', 'notes']);
    }
}
