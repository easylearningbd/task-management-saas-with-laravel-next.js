<?php

namespace App\Http\Requests\Admin;

use App\Enums\UserStatus;
use App\Models\Company;
use App\Models\User;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

/**
 * Edit Company: the create form plus `status`. The password is optional — blank keeps the
 * current one. The unique email ignores the company being edited.
 */
class UpdateCompanyRequest extends StoreCompanyRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('company'));
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'email', 'max:255', $this->uniqueEmail()],
            'status' => ['required', Rule::enum(UserStatus::class)],
            'enable_login' => ['sometimes', 'boolean'],
            'password' => ['nullable', 'string', 'confirmed', Password::defaults()],
        ];
    }

    protected function uniqueEmail(): mixed
    {
        /** @var Company $company */
        $company = $this->route('company');

        return Rule::unique(User::class, 'email')->ignore($company->getKey());
    }

    /**
     * @return array{name: string, email: string, status: string, enable_login?: bool, password: ?string}
     */
    public function companyData(): array
    {
        $password = $this->validated('password');

        return [
            'name' => trim($this->validated('name')),
            'email' => $this->validated('email'),
            'status' => $this->validated('status'),
            ...($this->has('enable_login') ? ['enable_login' => $this->boolean('enable_login')] : []),
            'password' => $password === null || $password === '' ? null : $password,
        ];
    }
}
