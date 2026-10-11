<?php

namespace App\Http\Requests\Company;

use App\Enums\PlanDuration;
use App\Models\Plan;
use App\Models\PlanOrder;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * POST /api/v1/plan-orders/request | /trial | /free — a plan (active, not deleted) and a billing
 * duration; `notes` for a request. The rules about WHICH plan a company may pick (current plan,
 * pending order, trial already used, $0 or not) live in BillingService (422 there).
 */
class PlanActionRequest extends FormRequest
{
    public const NOTES_MAX = 2000;

    public function authorize(): bool
    {
        return $this->user()->can('create', PlanOrder::class);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'plan_id' => ['required', 'integer', Rule::exists(Plan::class, 'id')->where('is_active', true)->whereNull('deleted_at')],
            'duration' => ['required', Rule::enum(PlanDuration::class)],
            'notes' => ['nullable', 'string', 'max:'.self::NOTES_MAX],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'plan_id.required' => __('Select a plan.'),
            'plan_id.integer' => __('Select a plan.'),
            'plan_id.exists' => __('This plan is not available.'),
            'duration.required' => __('Select monthly or yearly billing.'),
            'duration.enum' => __('Select monthly or yearly billing.'),
            'notes.max' => __('The notes may not be longer than :max characters.'),
        ];
    }

    public function plan(): Plan
    {
        return Plan::query()->findOrFail((int) $this->validated('plan_id'));
    }

    public function duration(): PlanDuration
    {
        return PlanDuration::from($this->validated('duration'));
    }

    public function notes(): ?string
    {
        return $this->validated('notes');
    }
}
