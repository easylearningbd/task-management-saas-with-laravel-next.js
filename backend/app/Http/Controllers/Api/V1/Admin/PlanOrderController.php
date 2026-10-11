<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\IndexPlanOrderRequest;
use App\Http\Requests\Admin\RejectPlanOrderRequest;
use App\Http\Resources\AdminPlanOrderResource;
use App\Services\BillingService;
use App\Services\PlanOrderService;
use App\Support\ListQuery;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Super Admin review of every company's plan orders (PRD §8.4–8.5) — API only for now; the admin
 * UI is the next task. Orders are tenant-owned, so they are resolved by id through
 * PlanOrderService (CrossTenant), not route-model binding. Approve applies the plan (and with it
 * the limits); reject only records the reason.
 */
class PlanOrderController extends Controller
{
    public function __construct(private readonly PlanOrderService $orders) {}

    public function index(IndexPlanOrderRequest $request): AnonymousResourceCollection
    {
        return AdminPlanOrderResource::collection(ListQuery::paginate($this->orders->query($request->filters()), $request));
    }

    public function show(int $order): AdminPlanOrderResource
    {
        return new AdminPlanOrderResource($this->orders->find($order));
    }

    /** PATCH …/{order}/approve — pending only; applies plan, duration and expiry to the company. */
    public function approve(Request $request, int $order): AdminPlanOrderResource
    {
        return new AdminPlanOrderResource($this->orders->approve($this->orders->find($order), $request->user()));
    }

    /** PATCH …/{order}/reject — pending only; the company is left as it is. */
    public function reject(RejectPlanOrderRequest $request, int $order): AdminPlanOrderResource
    {
        return new AdminPlanOrderResource($this->orders->reject($this->orders->find($order), $request->user(), $request->reason()));
    }

    public function receipt(Request $request, int $order): StreamedResponse
    {
        return BillingService::receiptResponse($this->orders->find($order), $request->boolean('download'));
    }
}
