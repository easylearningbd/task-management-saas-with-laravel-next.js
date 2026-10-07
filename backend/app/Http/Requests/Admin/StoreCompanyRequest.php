<?php

namespace App\Http\Requests\Admin;

use App\Models\Company;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * The Add New Company form. Only these keys reach CompanyService — `type`, `plan_id`,
 * `status` or anything else in the payload is ignored (a company is always a company, and
 * gets the default plan).
 */
class StoreCompanyRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Company::class);
    }

    protected function prepareForValidation(): void
    {
        // Same normalisation as RegisterRequest: trimmed and lowercase.
        if (is_string($this->input('email'))) {
            $this->merge(['email' => Str::lower(trim($this->input('email')))]);
        }
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', $this->uniqueEmail()],
            'enable_login' => ['sometimes', 'boolean'],
            // Login on: a password is required. Off: it is ignored (the account cannot sign in).
            'password' => $this->boolean('enable_login')
                ? ['required', 'string', 'confirmed', Password::defaults()]
                : ['nullable', 'string'],
        ];
    }

    /**
     * Unique across every user — super admins and soft-deleted accounts included (the column's
     * unique index covers them all).
     */
    protected function uniqueEmail(): mixed
    {
        return Rule::unique(User::class, 'email');
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            // The same wording as the frontend schema (messages/en.json → companies.validation).
            'name.required' => __('The company name is required.'),
            'name.max' => __('The company name may not be longer than :max characters.'),
            'email.required' => __('The email address is required.'),
            'email.email' => __('Enter a valid email address.'),
            'email.max' => __('The email address may not be longer than :max characters.'),
            'email.unique' => __('This email address is already in use.'),
            'password.required' => __('A password is required when login is enabled.'),
            'password.min' => __('The password must be at least :min characters.'),
            'password.confirmed' => __('The passwords do not match.'),
        ];
    }

    /**
     * The service's input: only the form's own fields.
     *
     * @return array{name: string, email: string, enable_login: bool, password: ?string}
     */
    public function companyData(): array
    {
        $enable = $this->boolean('enable_login');

        return [
            'name' => trim($this->validated('name')),
            'email' => $this->validated('email'),
            'enable_login' => $enable,
            'password' => $enable ? $this->validated('password') : null,
        ];
    }
}
