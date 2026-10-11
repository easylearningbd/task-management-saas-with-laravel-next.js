<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Http\Controllers\Controller;
use App\Http\Requests\Company\ReorderTaskChecklistRequest;
use App\Http\Requests\Company\StoreTaskChecklistItemRequest;
use App\Http\Requests\Company\UpdateTaskChecklistItemRequest;
use App\Http\Resources\TaskChecklistItemResource;
use App\Models\Task;
use App\Models\TaskChecklistItem;
use App\Services\TaskChecklistService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * A task's checklist (the Checklist tab): listed, added and reordered under the company's own
 * task; edited and removed by the item's own id. Both bindings resolve only the company's rows.
 */
class TaskChecklistItemController extends Controller
{
    public function __construct(private readonly TaskChecklistService $checklist) {}

    public function index(Task $task): AnonymousResourceCollection
    {
        Gate::authorize('view', $task);

        return TaskChecklistItemResource::collection($this->checklist->forTask($task));
    }

    public function store(StoreTaskChecklistItemRequest $request, Task $task): JsonResponse
    {
        $item = $this->checklist->create($task, $request->itemData());

        return (new TaskChecklistItemResource($item))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateTaskChecklistItemRequest $request, TaskChecklistItem $checklistItem): TaskChecklistItemResource
    {
        return new TaskChecklistItemResource($this->checklist->update($checklistItem, $request->itemData()));
    }

    public function destroy(TaskChecklistItem $checklistItem): Response
    {
        Gate::authorize('delete', $checklistItem);

        $this->checklist->delete($checklistItem);

        return response()->noContent();
    }

    /** PATCH …/checklist-items/reorder — every item id of the task, in the new order. */
    public function reorder(ReorderTaskChecklistRequest $request, Task $task): AnonymousResourceCollection
    {
        return TaskChecklistItemResource::collection($this->checklist->reorder($task, $request->ids()));
    }
}
