<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Http\Controllers\Controller;
use App\Http\Requests\Company\IndexTaskStageRequest;
use App\Http\Requests\Company\ReorderTaskStagesRequest;
use App\Http\Requests\Company\StoreTaskStageRequest;
use App\Http\Requests\Company\UpdateTaskStageRequest;
use App\Http\Resources\TaskStageResource;
use App\Models\TaskStage;
use App\Services\TaskStageService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * /api/v1/task-stages — the signed-in company's workflow stages (PRD §6.13). Tenancy is not
 * handled here: every query and route binding goes through BelongsToCompany, so another
 * company's stage id resolves to nothing and answers 404. The policy re-checks ownership;
 * every workflow rule is TaskStageService's.
 */
class TaskStageController extends Controller
{
    public function __construct(private readonly TaskStageService $stages) {}

    /** The whole workflow in order (filtered when asked), not paginated. */
    public function index(IndexTaskStageRequest $request): AnonymousResourceCollection
    {
        return TaskStageResource::collection($this->stages->withTaskCounts($this->stages->query($request->filters())->get()));
    }

    /** GET …/stats — total, active and inactive counts, and the done stage. */
    public function stats(): JsonResponse
    {
        Gate::authorize('viewAny', TaskStage::class);

        return response()->json(['data' => $this->stages->stats()]);
    }

    /** 201 — a new stage, or a deleted one of the same name restored with these values. */
    public function store(StoreTaskStageRequest $request): JsonResponse
    {
        return $this->resource($this->stages->create($request->stageData()))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(TaskStage $stage): TaskStageResource
    {
        Gate::authorize('view', $stage);

        return $this->resource($stage);
    }

    public function update(UpdateTaskStageRequest $request, TaskStage $stage): TaskStageResource
    {
        return $this->resource($this->stages->update($stage, $request->stageData()));
    }

    /** Soft delete; the stages after it move up. */
    public function destroy(TaskStage $stage): Response
    {
        Gate::authorize('delete', $stage);

        $this->stages->delete($stage);

        return response()->noContent();
    }

    /** PATCH …/{stage}/toggle-status — Active ↔ Inactive, within the workflow rules. */
    public function toggleStatus(TaskStage $stage): TaskStageResource
    {
        Gate::authorize('update', $stage);

        return $this->resource($this->stages->toggleStatus($stage));
    }

    /** PATCH …/reorder — the whole workflow in its new order. */
    public function reorder(ReorderTaskStagesRequest $request): AnonymousResourceCollection
    {
        return TaskStageResource::collection($this->stages->reorder($request->ids()));
    }

    private function resource(TaskStage $stage): TaskStageResource
    {
        $this->stages->withTaskCounts(new Collection([$stage]));

        return new TaskStageResource($stage);
    }
}
