<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Http\Controllers\Controller;
use App\Http\Requests\Company\AttachTaskFileRequest;
use App\Http\Resources\TaskFileResource;
use App\Models\Media;
use App\Models\Task;
use App\Models\TaskFile;
use App\Services\TaskFileService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * The task Files tab — mirrors ProjectFileController. Uploading (and the plan's storage limit)
 * stays on POST /api/v1/media; this only links library media to the task and unlinks it.
 */
class TaskFileController extends Controller
{
    public function __construct(private readonly TaskFileService $files) {}

    public function index(Task $task): AnonymousResourceCollection
    {
        Gate::authorize('view', $task);

        return TaskFileResource::collection($this->files->forTask($task));
    }

    /** 201 when linked now, 200 when it already was (idempotent). */
    public function store(AttachTaskFileRequest $request, Task $task): JsonResponse
    {
        $media = Media::query()->findOrFail($request->mediaId());
        [$file, $created] = $this->files->attach($task, $media, $request->user());

        return (new TaskFileResource($file))->response()->setStatusCode($created ? Response::HTTP_CREATED : Response::HTTP_OK);
    }

    public function destroy(TaskFile $file): Response
    {
        Gate::authorize('delete', $file);
        $this->files->detach($file);

        return response()->noContent();
    }
}
