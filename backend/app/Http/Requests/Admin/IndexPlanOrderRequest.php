<?php

namespace App\Http\Requests\Admin;

use App\Http\Requests\Company\IndexPlanOrderRequest as CompanyIndexPlanOrderRequest;

/**
 * GET /api/v1/admin/plan-orders — every company's orders: the company list's parameters, and the
 * search also matches the company's name and email (PlanOrderService::query). The route's
 * `role:super_admin` middleware is the guard.
 */
class IndexPlanOrderRequest extends CompanyIndexPlanOrderRequest
{
    public function authorize(): bool
    {
        return $this->user()->isSuperAdmin();
    }
}
