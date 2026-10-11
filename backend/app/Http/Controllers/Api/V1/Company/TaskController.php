<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Http\Controllers\Controller;
use App\Http\Requests\Company\IndexTaskRequest;
use App\Http\Requests\Company\MoveTaskRequest;
use App\Http\Requests\Company\StoreTaskRequest;
use App\Http\Requests\Company\UpdateTaskRequest;
use App\Http\Resources\TaskResource;
use App\Models\Task;
use App\Services\TaskService;
use App\Support\ListQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * The company's tasks (PRD §6.4). Route binding resolves only the company's own tasks
 * (BelongsToCompany — another company's id is a 404); policies check again. Every rule lives in
 * TaskService.
 */
class TaskController extends Controller
{
    public function __construct(private readonly TaskService $tasks) {}

    /**
     * `view=board` (default): `{ data: { columns: [{ stage, count, tasks }] } }` — every active
     * stage in order, each with its matching tasks in column order. `view=list`: the paginated,
     * sortable table.
     */
    public function index(IndexTaskRequest $request): JsonResponse|AnonymousResourceCollection
    {
        if ($request->view() === 'list') {
            return TaskResource::collection(ListQuery::paginate($this->tasks->query($request->filters()), $request));
        }

        $columns = array_map(fn (array $column) => [
            'stage' => [
                'id' => $column['stage']->id,
                'name' => $column['stage']->name,
                'color' => $column['stage']->color,
                'order' => $column['stage']->order,
                'is_done_stage' => $column['stage']->is_done_stage,
            ],
            'count' => $column['tasks']->count(),
            'tasks' => TaskResource::collection($column['tasks'])->resolve($request),
        ], $this->tasks->board($request->filters()));

        return response()->json(['data' => ['columns' => $columns]]);
    }

    /** GET …/stats — the four stat cards and the five priority tab counts. */
    public function stats(): JsonResponse
    {
        Gate::authorize('viewAny', Task::class);

        return response()->json(['data' => $this->tasks->stats()]);
    }

    /** 201 — company and creator from the session; the task lands at the end of its column. */
    public function store(StoreTaskRequest $request): JsonResponse
    {
        $task = $this->tasks->create($request->taskData(), $request->user());

        return (new TaskResource($this->tasks->loadDetails($task)))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    /** The details payload: the task with its stage, project, milestone, creator and tab counts. */
    public function show(Task $task): TaskResource
    {
        Gate::authorize('view', $task);

        return new TaskResource($this->tasks->loadDetails($task));
    }

    public function update(UpdateTaskRequest $request, Task $task): TaskResource
    {
        $task = $this->tasks->update($task, $request->taskData());

        return new TaskResource($this->tasks->loadDetails($task));
    }

    /** PATCH …/{task}/move — the drag: a stage (another company's → 404) and a 1-based position. */
    public function move(MoveTaskRequest $request, Task $task): TaskResource
    {
        $task = $this->tasks->move($task, $request->stageId(), $request->position());

        return new TaskResource($this->tasks->loadDetails($task));
    }

    /** Soft delete, with the task's checklist items and file links (the media stay). */
    public function destroy(Task $task): Response
    {
        Gate::authorize('delete', $task);

        $this->tasks->delete($task);

        return response()->noContent();
    }
}
