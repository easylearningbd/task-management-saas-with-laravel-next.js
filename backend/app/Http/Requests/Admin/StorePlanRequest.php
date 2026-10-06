<?php

namespace App\Http\Requests\Admin;

use App\Models\Plan;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePlanRequest extends FormRequest
{
    /** Largest values the columns hold: decimal(15,2) prices, decimal(8,2) storage. */
    public const MAX_PRICE = '9999999999999.99';

    public const MAX_STORAGE_GB = '999999.99';

    public function authorize(): bool
    {
        return $this->user()->can('create', Plan::class);
    }

    /**
     * `is_default` is accepted here but only ever applied by PlanService (one default, always
     * active). `sort_order` is never read from input.
     *
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'name' => [
                'required', 'string', 'max:255',
                // Includes soft-deleted plans: a deleted plan's name stays reserved (unique index).
                Rule::unique(Plan::class, 'name')->ignore($this->route('plan')),
            ],
            'description' => ['nullable', 'string', 'max:1000'],
            'monthly_price' => ['required', 'numeric', 'decimal:0,2', 'min:0', 'max:'.self::MAX_PRICE],
            'yearly_price' => ['nullable', 'numeric', 'decimal:0,2', 'min:0', 'max:'.self::MAX_PRICE],
            'max_projects' => ['required', 'integer', 'min:'.Plan::UNLIMITED],
            'storage_limit_gb' => ['required', 'numeric', 'decimal:0,2', 'min:0', 'max:'.self::MAX_STORAGE_GB],
            'trial_enabled' => ['sometimes', 'boolean'],
            'trial_days' => $this->boolean('trial_enabled')
                ? ['required', 'integer', 'min:1', 'max:3650']
                : ['nullable', 'integer', 'min:0', 'max:3650'],
            'ai_integration' => ['sometimes', 'boolean'],
            'is_active' => ['sometimes', 'boolean'],
            'is_default' => ['sometimes', 'boolean'],
            'is_recommended' => ['sometimes', 'boolean'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'max_projects.min' => __('Maximum projects must be 0 or more, or -1 for unlimited.'),
            'trial_days.required' => __('Trial days must be at least 1 when the trial is enabled.'),
            'trial_days.min' => $this->boolean('trial_enabled')
                ? __('Trial days must be at least 1 when the trial is enabled.')
                : __('Trial days may not be negative.'),
        ];
    }
}
