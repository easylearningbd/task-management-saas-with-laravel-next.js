<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Http\Controllers\Controller;
use App\Http\Requests\Company\StoreProjectItemRequest;
use App\Http\Requests\Company\UpdateProjectItemRequest;
use App\Http\Resources\ProjectItemResource;
use App\Models\Project;
use App\Models\ProjectItem;
use App\Services\ProjectItemService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * The Items tab: listed and created under `projects/{project}`, edited and deleted as
 * `project-items/{item}`. Both bindings are tenant-scoped (another company's id → 404).
 */
class ProjectItemController extends Controller
{
    public function __construct(private readonly ProjectItemService $items) {}

    public function index(Project $project): AnonymousResourceCollection
    {
        Gate::authorize('view', $project);

        return ProjectItemResource::collection($this->items->forProject($project));
    }

    public function store(StoreProjectItemRequest $request, Project $project): JsonResponse
    {
        return (new ProjectItemResource($this->items->create($project, $request->itemData())))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateProjectItemRequest $request, ProjectItem $item): ProjectItemResource
    {
        return new ProjectItemResource($this->items->update($item, $request->itemData()));
    }

    public function destroy(ProjectItem $item): Response
    {
        Gate::authorize('delete', $item);
        $this->items->delete($item);

        return response()->noContent();
    }
}
