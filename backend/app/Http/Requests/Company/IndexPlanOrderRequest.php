<?php

namespace App\Http\Requests\Company;

use App\Enums\PlanOrderStatus;
use App\Enums\PlanOrderType;
use App\Http\Requests\IndexRequest;
use App\Models\PlanOrder;
use Illuminate\Database\Query\Expression;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * GET /api/v1/plan-orders — the Plan Requests list: search (order code, reference, plan name),
 * `status`, `type`; sortable by the screenshot's three columns — Company, Plan, Requested At (the
 * names via subqueries, so no join changes the rows); newest first by default.
 */
class IndexPlanOrderRequest extends IndexRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('viewAny', PlanOrder::class);
    }

    /**
     * @return array<string, string|Expression>
     */
    public function sortable(): array
    {
        return [
            'company' => DB::raw('(select users.name from users where users.id = plan_orders.company_id)'),
            'plan' => DB::raw('(select plans.name from plans where plans.id = plan_orders.plan_id)'),
            'requested_at' => 'plan_orders.created_at',
        ];
    }

    public function defaultSort(): string
    {
        return 'plan_orders.created_at';
    }

    public function defaultDirection(): string
    {
        return 'desc';
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    protected function filterRules(): array
    {
        return [
            'status' => ['nullable', Rule::enum(PlanOrderStatus::class)],
            'type' => ['nullable', Rule::enum(PlanOrderType::class)],
        ];
    }

    /**
     * @return array{search: ?string, status: ?string, type: ?string}
     */
    public function filters(): array
    {
        return [
            'search' => $this->search(),
            'status' => $this->validated('status'),
            'type' => $this->validated('type'),
        ];
    }
}
