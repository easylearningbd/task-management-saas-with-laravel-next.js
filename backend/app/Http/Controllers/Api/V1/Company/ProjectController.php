<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Http\Controllers\Controller;
use App\Http\Requests\Company\IndexProjectRequest;
use App\Http\Requests\Company\StoreProjectRequest;
use App\Http\Requests\Company\UpdateProjectRequest;
use App\Http\Resources\ProjectDetailResource;
use App\Http\Resources\ProjectResource;
use App\Models\Project;
use App\Services\ProjectService;
use App\Support\ListQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * /api/v1/projects — the signed-in company's projects (PRD §6.3). Tenancy is not handled here:
 * every query and route binding goes through BelongsToCompany, so another company's project id
 * resolves to nothing and answers 404. The policy re-checks ownership; the plan limit and every
 * rule are ProjectService's.
 */
class ProjectController extends Controller
{
    public function __construct(private readonly ProjectService $projects) {}

    /** Paginated, searchable, filterable, sortable list (client eager-loaded — no N+1). */
    public function index(IndexProjectRequest $request): AnonymousResourceCollection
    {
        $page = ListQuery::paginate($this->projects->query($request->filters()), $request);
        $this->projects->withProgress($page->items());

        return ProjectResource::collection($page);
    }

    /** GET …/stats — the stat cards and the status tabs' counts. */
    public function stats(): JsonResponse
    {
        Gate::authorize('viewAny', Project::class);

        return response()->json(['data' => $this->projects->stats()]);
    }

    /** 201 — or 422 `plan_limit_reached` when the plan's project limit is reached. */
    public function store(StoreProjectRequest $request): JsonResponse
    {
        $project = $this->projects->create($request->projectData());
        $this->projects->withProgress([$project]);

        return (new ProjectResource($project))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    /** The details payload: the project, its figures and its tab counts. */
    public function show(Project $project): ProjectDetailResource
    {
        Gate::authorize('view', $project);

        $project->load('client')->loadCount(['milestones', 'items', 'notes', 'expenses', 'files']);

        return new ProjectDetailResource($project, $this->projects->figures($project));
    }

    public function update(UpdateProjectRequest $request, Project $project): ProjectResource
    {
        $project = $this->projects->update($project, $request->projectData());
        $this->projects->withProgress([$project]);

        return new ProjectResource($project);
    }

    /** Soft delete, with the project's milestones, items, notes, expenses and file links. */
    public function destroy(Project $project): Response
    {
        Gate::authorize('delete', $project);

        $this->projects->delete($project);

        return response()->noContent();
    }

    /** PATCH …/{project}/toggle-status — Active ⇄ Inactive only (422 on Completed / On Hold). */
    public function toggleStatus(Project $project): ProjectResource
    {
        Gate::authorize('update', $project);

        $project = $this->projects->toggleStatus($project);
        $this->projects->withProgress([$project]);

        return new ProjectResource($project);
    }
}
