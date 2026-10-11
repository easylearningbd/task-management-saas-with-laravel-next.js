<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Http\Controllers\Controller;
use App\Http\Requests\Company\IndexPlanOrderRequest;
use App\Http\Requests\Company\PlanActionRequest;
use App\Http\Requests\Company\StorePlanPurchaseRequest;
use App\Http\Resources\PlanOrderResource;
use App\Models\Company;
use App\Models\PlanOrder;
use App\Services\BillingService;
use App\Support\ListQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The company's plan orders (Billing PAGE SPECs A–C). Route binding resolves only the company's
 * own orders (BelongsToCompany — another company's id is a 404); policies check again. Every rule
 * lives in BillingService: submitting never changes the plan, except a trial or a $0 plan, which
 * apply at once (the response is then the approved order; the client refetches /me).
 */
class PlanOrderController extends Controller
{
    public function __construct(private readonly BillingService $billing) {}

    /** The Plan Requests list — paginated, newest first by default. */
    public function index(IndexPlanOrderRequest $request): AnonymousResourceCollection
    {
        return PlanOrderResource::collection(ListQuery::paginate($this->billing->orders($request->filters()), $request));
    }

    /** One order — the details modal. */
    public function show(PlanOrder $order): PlanOrderResource
    {
        Gate::authorize('view', $order);

        return new PlanOrderResource($order->load(['plan', 'company']));
    }

    /** POST /plan-orders — the checkout: a pending bank-transfer purchase with its receipt (201). */
    public function store(StorePlanPurchaseRequest $request): JsonResponse
    {
        $order = $this->billing->submitPurchase(
            $this->company($request),
            $request->plan(),
            $request->duration(),
            $request->paymentMethod(),
            $request->file('receipt'),
            $request->reference(),
            $request->notes(),
        );

        return $this->created($order);
    }

    /** POST /plan-orders/request — Request Plan: a pending request, nothing to pay (201). */
    public function request(PlanActionRequest $request): JsonResponse
    {
        return $this->created($this->billing->submitRequest($this->company($request), $request->plan(), $request->duration(), $request->notes()));
    }

    /** POST /plan-orders/trial — Start N Day Trial: applied at once (201). */
    public function trial(PlanActionRequest $request): JsonResponse
    {
        return $this->created($this->billing->startTrial($this->company($request), $request->plan(), $request->duration()));
    }

    /** POST /plan-orders/free — Subscribe Now on a $0 plan: applied at once (201). */
    public function free(PlanActionRequest $request): JsonResponse
    {
        return $this->created($this->billing->subscribeFree($this->company($request), $request->plan(), $request->duration()));
    }

    /** GET /plan-orders/{order}/receipt — streamed from the private disk; `?download=1` as a file. */
    public function receipt(Request $request, PlanOrder $order): StreamedResponse
    {
        Gate::authorize('view', $order);

        return BillingService::receiptResponse($order, $request->boolean('download'));
    }

    private function company(Request $request): Company
    {
        return Company::query()->findOrFail($request->user()->getKey());
    }

    private function created(PlanOrder $order): JsonResponse
    {
        return (new PlanOrderResource($order->load(['plan', 'company'])))->response()->setStatusCode(Response::HTTP_CREATED);
    }
}
