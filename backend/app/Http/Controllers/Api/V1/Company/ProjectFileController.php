<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Http\Controllers\Controller;
use App\Http\Requests\Company\AttachProjectFileRequest;
use App\Http\Resources\ProjectFileResource;
use App\Models\Media;
use App\Models\Project;
use App\Models\ProjectFile;
use App\Services\ProjectFileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * The Files tab: list and attach under `projects/{project}`; detach as `project-files/{file}`.
 * Attaching is idempotent — 201 when the link is new, 200 with the existing link when the file
 * was already attached. Detaching keeps the media in the library.
 */
class ProjectFileController extends Controller
{
    public function __construct(private readonly ProjectFileService $files) {}

    public function index(Project $project): AnonymousResourceCollection
    {
        Gate::authorize('view', $project);

        return ProjectFileResource::collection($this->files->forProject($project));
    }

    public function store(AttachProjectFileRequest $request, Project $project): JsonResponse
    {
        $media = Media::query()->findOrFail($request->mediaId());
        [$file, $created] = $this->files->attach($project, $media, $request->user());

        return (new ProjectFileResource($file))->response()->setStatusCode($created ? Response::HTTP_CREATED : Response::HTTP_OK);
    }

    public function destroy(ProjectFile $file): Response
    {
        Gate::authorize('delete', $file);
        $this->files->detach($file);

        return response()->noContent();
    }
}
