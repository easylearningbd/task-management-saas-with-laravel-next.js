<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Http\Controllers\Controller;
use App\Http\Resources\PlanCatalogResource;
use App\Models\Company;
use App\Models\PlanOrder;
use App\Services\BillingService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/** GET /api/v1/plans — the company Plans page: active plans, the current plan, trials, the pending order. */
class PlanCatalogController extends Controller
{
    public function __invoke(Request $request, BillingService $billing): PlanCatalogResource
    {
        Gate::authorize('viewAny', PlanOrder::class);

        return new PlanCatalogResource($billing->catalog(Company::query()->findOrFail($request->user()->getKey())));
    }
}
