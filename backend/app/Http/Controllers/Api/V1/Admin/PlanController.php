<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePlanRequest;
use App\Http\Requests\Admin\UpdatePlanRequest;
use App\Http\Resources\PlanResource;
use App\Models\Plan;
use App\Services\PlanService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * /api/v1/admin/plans — Super Admin subscription-plan management. Thin: Form Requests
 * validate and authorize, PlanService holds every business rule, PlanResource shapes output.
 */
class PlanController extends Controller
{
    public function __construct(private readonly PlanService $plans) {}

    /** All plans (a handful of tiers shown as one grid — not paginated), ordered. */
    public function index(): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Plan::class);

        return PlanResource::collection(Plan::query()->ordered()->withCount('subscribers')->get());
    }

    public function store(StorePlanRequest $request): JsonResponse
    {
        $plan = $this->plans->create($request->validated());

        return (new PlanResource($plan->loadCount('subscribers')))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Plan $plan): PlanResource
    {
        Gate::authorize('view', $plan);

        return new PlanResource($plan->loadCount('subscribers'));
    }

    public function update(UpdatePlanRequest $request, Plan $plan): PlanResource
    {
        return new PlanResource($this->plans->update($plan, $request->validated())->loadCount('subscribers'));
    }

    public function destroy(Plan $plan): Response
    {
        Gate::authorize('delete', $plan);

        $this->plans->delete($plan);

        return response()->noContent();
    }

    /** PATCH /api/v1/admin/plans/{plan}/toggle-active */
    public function toggleActive(Plan $plan): PlanResource
    {
        Gate::authorize('update', $plan);

        return new PlanResource($this->plans->toggleActive($plan)->loadCount('subscribers'));
    }
}
