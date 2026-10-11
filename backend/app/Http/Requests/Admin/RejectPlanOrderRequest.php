<?php

namespace App\Http\Requests\Admin;

use Illuminate\Foundation\Http\FormRequest;

/** PATCH /api/v1/admin/plan-orders/{order}/reject — the reason the company will read. */
class RejectPlanOrderRequest extends FormRequest
{
    public const REASON_MAX = 500;

    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin();
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'reason' => ['required', 'string', 'max:'.self::REASON_MAX],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'reason.required' => __('Give the company a reason for the rejection.'),
            'reason.max' => __('The reason may not be longer than :max characters.'),
        ];
    }

    public function reason(): string
    {
        return trim((string) $this->validated('reason'));
    }
}
