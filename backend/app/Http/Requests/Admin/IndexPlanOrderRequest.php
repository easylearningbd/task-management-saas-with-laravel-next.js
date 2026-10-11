<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\Company\IndexPlanOrderRequest as CompanyIndexPlanOrderRequest;
use Illuminate\Database\Query\Expression;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * GET /api/v1/admin/plan-orders — every company's orders (the admin Plan Requests page): the company
 * list's parameters, plus
 *  - search also matches the company's name and email (PlanOrderService::query);
 *  - `plan_id` (the Filters panel's Plan) next to `status` and `type`;
 *  - sortable by company, plan, created_at (`requested_at` kept as an alias) and status
 *    (alphabetical — MySQL would order the ENUM by declaration). Any other sort → 422.
 * Newest first by default. The route's `role:super_admin` middleware is the guard.
 */
class IndexPlanOrderRequest extends CompanyIndexPlanOrderRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin();
    }

    /**
     * @return array<string, string|Expression>
     */
    public function sortable(): array
    {
        return [
            ...parent::sortable(),
            'created_at' => 'plan_orders.created_at',
            'status' => DB::raw('CAST(plan_orders.status AS CHAR)'),
        ];
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    protected function filterRules(): array
    {
        return [
            ...parent::filterRules(),
            'plan_id' => ['nullable', 'integer', Rule::exists('plans', 'id')],
        ];
    }

    /**
     * @return array{search: ?string, status: ?string, type: ?string, plan_id: ?int}
     */
    public function filters(): array
    {
        $planId = $this->validated('plan_id');

        return [
            ...parent::filters(),
            'plan_id' => $planId !== null ? (int) $planId : null,
        ];
    }
}
