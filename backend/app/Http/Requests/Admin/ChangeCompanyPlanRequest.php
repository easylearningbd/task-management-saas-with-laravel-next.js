<?php

namespace App\Http\Requests\Admin;

use App\Enums\PlanDuration;
use App\Models\Plan;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/** PATCH /api/v1/admin/companies/{company}/change-plan — an active, not-deleted plan + a duration. */
class ChangeCompanyPlanRequest extends FormRequest
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
            'plan_id' => [
                'required', 'integer',
                Rule::exists(Plan::class, 'id')->where('is_active', true)->whereNull('deleted_at'),
            ],
            'duration' => ['required', Rule::enum(PlanDuration::class)],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'plan_id.required' => __('Select a plan.'),
            'plan_id.exists' => __('This plan is not available.'),
            'duration.required' => __('Select monthly or yearly billing.'),
        ];
    }

    public function plan(): Plan
    {
        return Plan::query()->findOrFail($this->validated('plan_id'));
    }

    public function duration(): PlanDuration
    {
        return PlanDuration::from($this->validated('duration'));
    }
}
