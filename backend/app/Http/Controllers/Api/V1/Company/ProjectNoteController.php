<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Http\Controllers\Controller;
use App\Http\Requests\Company\StoreProjectNoteRequest;
use App\Http\Requests\Company\UpdateProjectNoteRequest;
use App\Http\Resources\ProjectNoteResource;
use App\Models\Project;
use App\Models\ProjectNote;
use App\Services\ProjectNoteService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * The Notes tab: listed and created under `projects/{project}`; shown (the view modal), edited
 * and deleted as `project-notes/{note}`. The author is the signed-in user.
 */
class ProjectNoteController extends Controller
{
    public function __construct(private readonly ProjectNoteService $notes) {}

    public function index(Project $project): AnonymousResourceCollection
    {
        Gate::authorize('view', $project);

        return ProjectNoteResource::collection($this->notes->forProject($project));
    }

    public function store(StoreProjectNoteRequest $request, Project $project): JsonResponse
    {
        return (new ProjectNoteResource($this->notes->create($project, $request->noteData(), $request->user())))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(ProjectNote $note): ProjectNoteResource
    {
        Gate::authorize('view', $note);

        return new ProjectNoteResource($note->load('author'));
    }

    public function update(UpdateProjectNoteRequest $request, ProjectNote $note): ProjectNoteResource
    {
        return new ProjectNoteResource($this->notes->update($note, $request->noteData()));
    }

    public function destroy(Request $request, ProjectNote $note): Response
    {
        Gate::authorize('delete', $note);
        $this->notes->delete($note);

        return response()->noContent();
    }
}
