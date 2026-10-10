<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Http\Controllers\Controller;
use App\Http\Requests\Company\StoreMilestoneRequest;
use App\Http\Requests\Company\UpdateMilestoneRequest;
use App\Http\Resources\MilestoneResource;
use App\Models\Milestone;
use App\Models\Project;
use App\Services\MilestoneService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * A project's milestones: listed and created under `projects/{project}`, edited and deleted as
 * `milestones/{milestone}`. Both bindings go through BelongsToCompany, so another company's
 * project or milestone is a 404. Not paginated — a project has a handful of milestones.
 */
class MilestoneController extends Controller
{
    public function __construct(private readonly MilestoneService $milestones) {}

    public function index(Project $project): AnonymousResourceCollection
    {
        Gate::authorize('view', $project);

        return MilestoneResource::collection($this->milestones->forProject($project));
    }

    public function store(StoreMilestoneRequest $request, Project $project): JsonResponse
    {
        return (new MilestoneResource($this->milestones->create($project, $request->milestoneData())))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateMilestoneRequest $request, Milestone $milestone): MilestoneResource
    {
        return new MilestoneResource($this->milestones->update($milestone, $request->milestoneData()));
    }

    /** Soft delete. */
    public function destroy(Milestone $milestone): Response
    {
        Gate::authorize('delete', $milestone);

        $this->milestones->delete($milestone);

        return response()->noContent();
    }
}
