<?php

namespace App\Http\Requests\Company;

use App\Enums\PaymentMethod;
use App\Services\BillingService;
use Closure;
use Illuminate\Validation\Rule;

/**
 * POST /api/v1/plan-orders — the checkout (multipart):
 *   plan_id*, duration*                  as PlanActionRequest
 *   payment_method*  bank_transfer only — `stripe` is refused here AND in BillingService, however
 *                    the request was made (not integrated yet); manual / free aren't checkout methods
 *   receipt*         JPG, PNG or PDF (by extension and detected content), max 5 MB
 *   payment_reference  optional, max 100
 *   notes              optional, max 2000
 */
class StorePlanPurchaseRequest extends PlanActionRequest
{
    public const REFERENCE_MAX = 100;

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            ...parent::rules(),
            'payment_method' => [
                'required',
                Rule::enum(PaymentMethod::class),
                function (string $attribute, mixed $value, Closure $fail): void {
                    if ($value === PaymentMethod::Stripe->value) {
                        $fail(__('Card payments aren\'t available yet. Please pay by bank transfer.'));
                    } elseif ($value !== PaymentMethod::BankTransfer->value) {
                        $fail(__('Choose bank transfer to pay for this plan.'));
                    }
                },
            ],
            'receipt' => [
                'required', 'file',
                'mimes:jpg,jpeg,png,pdf',
                'mimetypes:'.implode(',', array_keys(BillingService::RECEIPT_TYPES)),
                'max:'.BillingService::RECEIPT_MAX_KB,
            ],
            'payment_reference' => ['nullable', 'string', 'max:'.self::REFERENCE_MAX],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            ...parent::messages(),
            'payment_method.required' => __('Choose a payment method.'),
            'payment_method.enum' => __('Choose bank transfer to pay for this plan.'),
            'receipt.required' => __('Attach the payment receipt.'),
            'receipt.file' => __('Attach the payment receipt.'),
            'receipt.uploaded' => __('The receipt could not be uploaded. Try a file under 5 MB.'),
            'receipt.mimes' => __('The receipt must be a JPG, PNG or PDF file.'),
            'receipt.mimetypes' => __('The receipt must be a JPG, PNG or PDF file.'),
            'receipt.max' => __('The receipt may not be larger than 5 MB.'),
            'payment_reference.max' => __('The reference may not be longer than :max characters.'),
        ];
    }

    public function paymentMethod(): PaymentMethod
    {
        return PaymentMethod::from($this->validated('payment_method'));
    }

    public function reference(): ?string
    {
        return $this->validated('payment_reference');
    }
}
