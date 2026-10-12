<?php

namespace App\Http\Requests\Company;

use App\Enums\PaymentType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * POST /api/v1/invoices/{invoice}/payments — the Add Payment modal: amount (> 0, 2 decimals),
 * payment method (Bank Transfer by default), notes. The OVERPAYMENT GUARD is PaymentService's: it
 * compares the amount with the balance due under a row lock (422 naming the balance).
 */
class StoreInvoicePaymentRequest extends FormRequest
{
    public const DESCRIPTION_MAX = 1000;

    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('invoice'));
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'amount' => ['required', 'numeric', 'decimal:0,2', 'gt:0', 'max:'.StoreInvoiceRequest::MONEY_MAX],
            'payment_type' => ['nullable', Rule::enum(PaymentType::class)],
            'description' => ['nullable', 'string', 'max:'.self::DESCRIPTION_MAX],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'amount.required' => __('Enter the payment amount.'),
            'amount.gt' => __('The payment amount must be greater than 0.'),
        ];
    }

    /**
     * @return array{amount: string, payment_type: string, description: ?string}
     */
    public function paymentData(): array
    {
        return [
            'amount' => (string) $this->validated('amount'),
            'payment_type' => $this->validated('payment_type') ?? PaymentType::BankTransfer->value,
            'description' => $this->validated('description'),
        ];
    }
}
