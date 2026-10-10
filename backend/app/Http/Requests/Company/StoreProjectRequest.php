<?php

namespace App\Http\Requests\Company;

use App\Enums\ClientStatus;
use App\Enums\ProjectPriority;
use App\Enums\ProjectStatus;
use App\Models\Project;
use App\Support\Tenancy\Tenancy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Exists;

/**
 * POST /api/v1/projects — the Add New Project form (PRD §6.3): Project Name*, Description,
 * Client* (one of this company's active clients), Start Date*, End Date* (≥ start), Budget*
 * (≥ 0), Priority (Medium), Status (Active). `company_id` is never read from the request:
 * BelongsToCompany sets it. The plan's project limit is checked by ProjectService (a 422 with
 * code `plan_limit_reached`). The same rules and wording live in the frontend schema.
 */
class StoreProjectRequest extends FormRequest
{
    public const NAME_MAX = 255;

    public const DESCRIPTION_MAX = 5000;

    /** DECIMAL(15,2) holds up to 13 digits before the point. */
    public const BUDGET_MAX = '9999999999999.99';

    public function authorize(): bool
    {
        return $this->user()->can('create', Project::class);
    }

    protected function prepareForValidation(): void
    {
        $trimmed = [];
        foreach (['name', 'description', 'budget'] as $field) {
            if (is_string($this->input($field))) {
                $trimmed[$field] = trim($this->input($field));
            }
        }
        if (($trimmed['description'] ?? null) === '') {
            $trimmed['description'] = null;
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
            'description' => ['nullable', 'string', 'max:'.self::DESCRIPTION_MAX],
            'client_id' => ['required', 'integer', $this->clientRule()],
            'start_date' => ['required', 'date_format:Y-m-d'],
            'end_date' => ['required', 'date_format:Y-m-d', 'after_or_equal:start_date'],
            'budget' => ['required', 'numeric', 'decimal:0,2', 'min:0', 'max:'.self::BUDGET_MAX],
            'priority' => ['sometimes', Rule::enum(ProjectPriority::class)],
            'status' => ['sometimes', Rule::enum(ProjectStatus::class)],
        ];
    }

    /** One of this company's active clients — another company's client id is simply unknown. */
    protected function clientRule(): Exists
    {
        return $this->companyClients()->where('status', ClientStatus::Active->value);
    }

    /** This company's live (not deleted) clients. */
    protected function companyClients(): Exists
    {
        return Rule::exists('clients', 'id')
            ->where('company_id', Tenancy::instance()->requireCompanyId())
            ->whereNull('deleted_at');
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.required' => __('The project name is required.'),
            'name.max' => __('The project name may not be longer than :max characters.'),
            'description.max' => __('The description may not be longer than :max characters.'),
            'client_id.required' => __('Select a client.'),
            'client_id.integer' => __('Select a client.'),
            'client_id.exists' => __('Select one of your active clients.'),
            'start_date.required' => __('The start date is required.'),
            'start_date.date_format' => __('Enter a valid start date.'),
            'end_date.required' => __('The end date is required.'),
            'end_date.date_format' => __('Enter a valid end date.'),
            'end_date.after_or_equal' => __('The end date can\'t be before the start date.'),
            'budget.required' => __('The budget is required.'),
            'budget.numeric' => __('Enter the budget as a number.'),
            'budget.decimal' => __('The budget can have at most 2 decimal places.'),
            'budget.min' => __('The budget can\'t be negative.'),
            'budget.max' => __('The budget is too large.'),
        ];
    }

    /**
     * Only the form's fields — anything else in the body (company_id, id, …) is dropped.
     *
     * @return array<string, mixed>
     */
    public function projectData(): array
    {
        return $this->safe()->only(['name', 'description', 'client_id', 'start_date', 'end_date', 'budget', 'priority', 'status']);
    }
}
