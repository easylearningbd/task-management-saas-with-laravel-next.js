<?php

namespace App\Http\Requests\Admin;

use App\Enums\CouponType;
use App\Models\Coupon;
use App\Services\CouponService;
use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * The Add / Edit Coupon form. Mirrors the CouponService rules so errors come back per field;
 * the service re-checks everything (and owns the auto-generate collision handling).
 */
class StoreCouponRequest extends FormRequest
{
    /** Largest value a DECIMAL(15,2) column holds. */
    public const MAX_MONEY = '9999999999999.99';

    public function authorize(): bool
    {
        return $this->user()->can('create', Coupon::class);
    }

    /** Codes are compared and stored trimmed + uppercase. */
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('code'))) {
            $this->merge(['code' => Coupon::normalizeCode($this->input('code'))]);
        }
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        $auto = $this->input('code_mode') === 'auto';
        $percentage = $this->input('type') === CouponType::Percentage->value;

        return [
            'name' => ['required', 'string', 'max:255'],
            'code_mode' => ['required', Rule::in(['manual', 'auto'])],
            'code' => [
                // Auto Generate may leave the code to the server.
                $auto ? 'nullable' : 'required',
                'string',
                'regex:'.CouponService::CODE_PATTERN,
                // Manual codes only: an auto-generated code that collides is replaced instead.
                // Includes soft-deleted coupons — a deleted coupon's code stays reserved.
                ...($auto ? [] : [Rule::unique(Coupon::class, 'code')->ignore($this->route('coupon'))]),
            ],
            'type' => ['required', Rule::enum(CouponType::class)],
            'value' => ['bail', 'required', 'numeric', 'decimal:0,2', 'gt:0', 'max:'.($percentage ? '100' : self::MAX_MONEY)],
            'min_spend' => ['nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:'.self::MAX_MONEY],
            'max_spend' => [
                'nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:'.self::MAX_MONEY,
                ...($this->filled('min_spend') && is_numeric($this->input('min_spend')) ? ['gte:min_spend'] : []),
            ],
            'usage_limit' => ['nullable', 'integer', 'min:1', 'max:'.CouponService::LIMIT_MAX],
            'per_user_limit' => ['nullable', 'integer', 'min:1', 'max:'.CouponService::LIMIT_MAX],
            'expiry_date' => ['bail', 'nullable', 'date_format:Y-m-d', $this->expiryRule()],
            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    /** Create: today or later. (UpdateCouponRequest also lets an unchanged past date through.) */
    protected function expiryRule(): Closure
    {
        return function (string $attribute, mixed $value, Closure $fail): void {
            if (is_string($value) && $value < today()->toDateString()) {
                $fail(__('The expiry date cannot be in the past.'));
            }
        };
    }

    /**
     * Every rule has a form-friendly message — the same wording the frontend schema uses
     * (messages/en.json → coupons.validation), so a field reads the same either way.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        $amount = __('Enter an amount with at most 2 decimal places.');
        $tooLarge = __('That amount is too large.');
        $limit = __('Leave empty for unlimited, or enter a whole number of at least 1.');

        return [
            'name.required' => __('The coupon name is required.'),
            'name.max' => __('The coupon name may not be longer than :max characters.'),
            'code.required' => __('The coupon code is required.'),
            'code.regex' => __('Use up to 50 letters, digits, hyphens or underscores.'),
            'code.unique' => __('This coupon code is already in use.'),
            'type.required' => __('Select a discount type.'),
            'type.enum' => __('Select a discount type.'),
            'value.required' => __('The discount value is required.'),
            'value.numeric' => $amount,
            'value.decimal' => $amount,
            'value.gt' => __('The discount value must be greater than 0.'),
            'value.max' => $this->input('type') === CouponType::Percentage->value
                ? __('A percentage discount cannot be more than 100%.')
                : $tooLarge,
            'min_spend.numeric' => $amount,
            'min_spend.decimal' => $amount,
            'min_spend.min' => $amount,
            'min_spend.max' => $tooLarge,
            'max_spend.numeric' => $amount,
            'max_spend.decimal' => $amount,
            'max_spend.min' => $amount,
            'max_spend.max' => $tooLarge,
            'max_spend.gte' => __('The maximum spend must be greater than or equal to the minimum spend.'),
            'usage_limit.integer' => $limit,
            'usage_limit.min' => $limit,
            'usage_limit.max' => $limit,
            'per_user_limit.integer' => $limit,
            'per_user_limit.min' => $limit,
            'per_user_limit.max' => $limit,
            'expiry_date.date_format' => __('Enter a valid date.'),
        ];
    }
}
