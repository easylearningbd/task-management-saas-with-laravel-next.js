<?php

namespace App\Services;

use App\Enums\TaskPriority;
use App\Enums\TaskStageStatus;
use App\Models\Milestone;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskStage;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection as EloquentCollection;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Tasks — every rule of the Kanban board (PRD §6.4, the Tasks module's BUSINESS RULES), in one
 * place. Everything runs in the current company's scope (BelongsToCompany), so a project, stage or
 * milestone id from another company is simply not found.
 *
 *  1. The milestone, when given, must belong to the task's project (422 `milestone_id`); when the
 *     project changes and the request doesn't name a milestone, an incompatible one is cleared.
 *  2. The stage must be one of the company's ACTIVE stages (422 `task_stage_id`).
 *  3. Entering a done stage sets progress 100 and `completed_at` (now). While a task sits in a
 *     done stage its progress stays 100.
 *  4. Leaving a done stage clears `completed_at`; progress stays as it was.
 *  6. `position` is contiguous from 1 within each stage column. A move writes the destination
 *     column's whole sequence and renumbers the source column, in one transaction, with the
 *     stages involved locked (MySQL; a no-op on SQLite).
 *  7. Deleting a task removes its checklist items and file links (the media stays) and closes
 *     the gap in its column.
 * (5 — overdue — is Task::scopeOverdue; 8 — the stage delete guard — is TaskStageService.)
 */
class TaskService
{
    public const MILESTONE_KEY = 'milestone_id';

    public const STAGE_KEY = 'task_stage_id';

    /* ── Reading ───────────────────────────────────────────────────────────────────────── */

    /**
     * The list / board query: search (title, description), project, milestone, stage, priority.
     * Everything a card shows is eager-loaded or counted in the same select — no N+1.
     *
     * @param  array{search?: ?string, project_id?: ?int, milestone_id?: ?int, task_stage_id?: ?int, priority?: ?string}  $filters
     * @return Builder<Task>
     */
    public function query(array $filters): Builder
    {
        $search = trim((string) ($filters['search'] ?? ''));
        $like = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $search).'%';

        return Task::query()
            ->with(self::CARD_RELATIONS)
            ->withCount($this->cardCounts())
            ->when($search !== '', fn (Builder $q) => $q->where(fn (Builder $w) => $w
                ->whereRaw("tasks.title like ? escape '!'", [$like])
                ->orWhereRaw("tasks.description like ? escape '!'", [$like])))
            ->when($filters['project_id'] ?? null, fn (Builder $q, int $id) => $q->where('tasks.project_id', $id))
            ->when($filters['milestone_id'] ?? null, fn (Builder $q, int $id) => $q->where('tasks.milestone_id', $id))
            ->when($filters['task_stage_id'] ?? null, fn (Builder $q, int $id) => $q->where('tasks.task_stage_id', $id))
            ->when($filters['priority'] ?? null, fn (Builder $q, string $p) => $q->where('tasks.priority', $p));
    }

    /**
     * The Kanban board: one column per ACTIVE stage, in the stage order, each with its matching
     * tasks in column order. Two queries whatever the board's size (stages, then tasks).
     *
     * @param  array{search?: ?string, project_id?: ?int, milestone_id?: ?int, task_stage_id?: ?int, priority?: ?string}  $filters
     * @return list<array{stage: TaskStage, tasks: EloquentCollection<int, Task>}>
     */
    public function board(array $filters): array
    {
        $stages = TaskStage::query()->active()->ordered()->get();
        $tasks = $this->query($filters)
            ->whereIn('tasks.task_stage_id', $stages->modelKeys())
            ->inColumnOrder()
            ->get()
            ->groupBy('task_stage_id');

        return $stages->map(fn (TaskStage $stage) => [
            'stage' => $stage,
            'tasks' => $tasks->get($stage->getKey(), new EloquentCollection),
        ])->values()->all();
    }

    /**
     * The four stat cards and the five priority tabs (company-wide, whatever the filters):
     * total · high (High + Urgent) · low (Low + Medium) · overdue · per priority.
     *
     * @return array{total: int, high: int, low: int, overdue: int, priorities: array<string, int>}
     */
    public function stats(): array
    {
        $byPriority = Task::query()->selectRaw('tasks.priority, COUNT(*) as aggregate')->groupBy('tasks.priority')->pluck('aggregate', 'priority');
        $count = fn (array $priorities) => (int) collect($priorities)->sum(fn (TaskPriority $p) => (int) ($byPriority[$p->value] ?? 0));

        return [
            'total' => (int) $byPriority->sum(),
            'high' => $count(TaskPriority::highGroup()),
            'low' => $count(TaskPriority::lowGroup()),
            'overdue' => Task::query()->overdue()->count(),
            'priorities' => collect(TaskPriority::cases())->mapWithKeys(fn (TaskPriority $p) => [$p->value => (int) ($byPriority[$p->value] ?? 0)])->all(),
        ];
    }

    /**
     * Each project's live tasks and how many are in a done stage — one grouped query for any
     * number of projects (the Projects list's Progress column, a project's figures). Projects
     * without tasks are absent.
     *
     * @param  list<int>  $projectIds
     * @return array<int, array{total: int, completed: int}>
     */
    public function completionByProject(array $projectIds): array
    {
        if ($projectIds === []) {
            return [];
        }

        return Task::query()
            ->join('task_stages', 'task_stages.id', '=', 'tasks.task_stage_id')
            ->whereIn('tasks.project_id', $projectIds)
            ->groupBy('tasks.project_id')
            ->selectRaw('tasks.project_id, COUNT(*) as total, SUM(CASE WHEN task_stages.is_done_stage = 1 THEN 1 ELSE 0 END) as completed')
            ->toBase()
            ->get()
            ->mapWithKeys(fn (object $row) => [(int) $row->project_id => ['total' => (int) $row->total, 'completed' => (int) $row->completed]])
            ->all();
    }

    /** The project's tasks past due and not in a done stage (business rule 5). */
    public function overdueCount(int $projectId): int
    {
        return Task::query()->where('tasks.project_id', $projectId)->overdue()->count();
    }

    /** The details page: the card's data plus the creator and the tab counts. */
    public function loadDetails(Task $task): Task
    {
        return $task->load(self::CARD_RELATIONS)->loadCount([...$this->cardCounts(), 'files']);
    }

    /** What a card or a row shows. */
    public const CARD_RELATIONS = ['project:id,name', 'milestone:id,title', 'stage:id,name,color,is_done_stage', 'creator:id,name,email,avatar'];

    /**
     * The checklist summary, counted in the same select (`checklist_items_count`,
     * `checklist_completed_count`).
     *
     * @return array<int|string, mixed>
     */
    private function cardCounts(): array
    {
        return [
            'checklistItems',
            'checklistItems as checklist_completed_count' => fn (Builder $q) => $q->where('task_checklist_items.is_completed', true),
        ];
    }

    /* ── Writing ───────────────────────────────────────────────────────────────────────── */

    /**
     * @param  array<string, mixed>  $data  validated title, description, project_id, milestone_id, task_stage_id, start_date, due_date, priority, progress
     */
    public function create(array $data, User $creator): Task
    {
        return DB::transaction(function () use ($data, $creator): Task {
            $stage = $this->activeStage((int) $data['task_stage_id']);
            $this->lockStages([$stage->getKey()]);
            $this->ensureMilestoneBelongs((int) $data['project_id'], $data['milestone_id'] ?? null);

            $task = new Task($this->fillable($data));
            $task->forceFill([
                'task_stage_id' => $stage->getKey(),
                'position' => $this->nextPosition($stage->getKey()),
                'created_by' => $creator->getKey(),
            ]);
            $this->applyStageRules($task, $stage, null);
            $task->save();

            return $task;
        });
    }

    /**
     * A stage change through the form puts the task at the end of the new column.
     *
     * @param  array<string, mixed>  $data  validated form fields (as for create)
     */
    public function update(Task $task, array $data): Task
    {
        return DB::transaction(function () use ($task, $data): Task {
            $projectId = (int) ($data['project_id'] ?? $task->project_id);

            if (array_key_exists('milestone_id', $data)) {
                $this->ensureMilestoneBelongs($projectId, $data['milestone_id']);
            } elseif ($projectId !== $task->project_id && $task->milestone_id !== null
                && ! $this->milestoneBelongs($projectId, $task->milestone_id)) {
                $data['milestone_id'] = null; // the project changed: an incompatible milestone goes
            }

            $from = $this->stage($task->task_stage_id);
            $to = isset($data['task_stage_id']) && (int) $data['task_stage_id'] !== $task->task_stage_id
                ? $this->activeStage((int) $data['task_stage_id'])
                : $from;

            $task->fill($this->fillable($data));

            if ($to->getKey() !== $from->getKey()) {
                $this->lockStages([$from->getKey(), $to->getKey()]);
                $task->forceFill(['task_stage_id' => $to->getKey(), 'position' => $this->nextPosition($to->getKey())]);
                $this->applyStageRules($task, $to, $from);
                $task->save();
                $this->renumber($from->getKey());
            } else {
                $this->applyStageRules($task, $to, $from);
                $task->save();
            }

            return $task;
        });
    }

    /**
     * The drag endpoint: put the task at `$position` (1-based) in `$stageId`'s column — another
     * column (a stage change) or its own (a reorder). A stage of another company is a 404; an
     * inactive one a 422. Positions past the end land last.
     */
    public function move(Task $task, int $stageId, int $position): Task
    {
        return DB::transaction(function () use ($task, $stageId, $position): Task {
            $to = TaskStage::query()->findOrFail($stageId);
            if ($to->status !== TaskStageStatus::Active) {
                $this->fail(self::STAGE_KEY, __('Tasks can only move to an active stage.'));
            }
            $from = $this->stage($task->task_stage_id);
            $this->lockStages(array_unique([$from->getKey(), $to->getKey()]));

            $column = Task::query()
                ->where('tasks.task_stage_id', $to->getKey())
                ->whereKeyNot($task->getKey())
                ->inColumnOrder()
                ->pluck('tasks.id')
                ->all();
            $index = max(0, min($position - 1, count($column)));
            array_splice($column, $index, 0, [$task->getKey()]);

            $task->forceFill(['task_stage_id' => $to->getKey(), 'position' => $index + 1]);
            $this->applyStageRules($task, $to, $from);
            $task->save();

            $this->writeSequence($column);
            if ($from->getKey() !== $to->getKey()) {
                $this->renumber($from->getKey());
            }

            return $task;
        });
    }

    /** Soft-deletes the task; its checklist items and file links go; its column closes up. */
    public function delete(Task $task): void
    {
        DB::transaction(function () use ($task): void {
            $this->lockStages([$task->task_stage_id]);
            $task->checklistItems()->delete();
            $task->files()->delete();
            $task->delete();
            $this->renumber($task->task_stage_id);
        });
    }

    /**
     * A project is being deleted (ProjectService::delete, inside its transaction): its tasks go the
     * same way as one deleted by hand, and the columns they leave close up.
     */
    public function deleteForProject(Project $project): void
    {
        $tasks = $project->tasks()->get(['tasks.id', 'tasks.task_stage_id']);
        if ($tasks->isEmpty()) {
            return;
        }
        $stageIds = $tasks->pluck('task_stage_id')->unique()->values()->all();
        $this->lockStages($stageIds);

        $taskIds = $tasks->pluck('id')->all();
        DB::table('task_checklist_items')->whereIn('task_id', $taskIds)->delete();
        DB::table('task_files')->whereIn('task_id', $taskIds)->delete();
        $project->tasks()->delete();

        foreach ($stageIds as $stageId) {
            $this->renumber($stageId);
        }
    }

    /**
     * The company's done stage changed (TaskStageService, inside its transaction): the tasks follow
     * rules 3 and 4 as if they had moved — those now in the done stage are completed (100%,
     * `completed_at` kept if already set), those in the former one are not (progress kept).
     */
    public function doneStageMoved(?TaskStage $from, TaskStage $to): void
    {
        if ($from !== null) {
            Task::query()->where('tasks.task_stage_id', $from->getKey())->toBase()->update(['completed_at' => null]);
        }
        Task::query()->where('tasks.task_stage_id', $to->getKey())->toBase()->update(['progress' => 100]);
        Task::query()->where('tasks.task_stage_id', $to->getKey())->whereNull('tasks.completed_at')->toBase()->update(['completed_at' => Carbon::now()]);
    }

    /** A milestone is being deleted (MilestoneService): its tasks keep going, without it. */
    public function detachMilestone(Milestone $milestone): void
    {
        $milestone->tasks()->update(['milestone_id' => null]);
    }

    /* ── Rules ─────────────────────────────────────────────────────────────────────────── */

    /** Rules 3 and 4: what entering or leaving a done stage does. */
    private function applyStageRules(Task $task, TaskStage $to, ?TaskStage $from): void
    {
        if ($to->is_done_stage) {
            $task->progress = 100;
            if ($from === null || ! $from->is_done_stage || $task->completed_at === null) {
                $task->completed_at = Carbon::now();
            }

            return;
        }

        $task->completed_at = null;
    }

    private function ensureMilestoneBelongs(int $projectId, mixed $milestoneId): void
    {
        if ($milestoneId === null || $milestoneId === '') {
            return;
        }
        if (! $this->milestoneBelongs($projectId, (int) $milestoneId)) {
            $this->fail(self::MILESTONE_KEY, __('Select a milestone of the selected project.'));
        }
    }

    private function milestoneBelongs(int $projectId, int $milestoneId): bool
    {
        return Milestone::query()->whereKey($milestoneId)->where('milestones.project_id', $projectId)->exists();
    }

    private function activeStage(int $id): TaskStage
    {
        $stage = TaskStage::query()->find($id);
        if (! $stage || $stage->status !== TaskStageStatus::Active) {
            $this->fail(self::STAGE_KEY, __('Select one of your active stages.'));
        }

        return $stage;
    }

    /** The task's current stage — even one deactivated or deleted since. */
    private function stage(int $id): TaskStage
    {
        return TaskStage::withTrashed()->findOrFail($id);
    }

    /* ── Positions ─────────────────────────────────────────────────────────────────────── */

    private function nextPosition(int $stageId): int
    {
        return (int) Task::query()->where('tasks.task_stage_id', $stageId)->max('tasks.position') + 1;
    }

    /** Closes any gap in a column: 1, 2, 3 … in the current order. */
    private function renumber(int $stageId): void
    {
        $this->writeSequence(Task::query()->where('tasks.task_stage_id', $stageId)->inColumnOrder()->pluck('tasks.id')->all());
    }

    /**
     * Writes positions 1…n for these ids, touching only rows that change. A plain query update:
     * moving one card doesn't bump its neighbours' `updated_at`.
     *
     * @param  list<int>  $ids
     */
    private function writeSequence(array $ids): void
    {
        foreach (array_values($ids) as $index => $id) {
            Task::query()->whereKey($id)->where('tasks.position', '!=', $index + 1)->toBase()->update(['position' => $index + 1]);
        }
    }

    /**
     * Serialises board writes on these columns for the rest of the transaction.
     *
     * @param  list<int>  $stageIds
     */
    private function lockStages(array $stageIds): void
    {
        TaskStage::withTrashed()->whereKey($stageIds)->lockForUpdate()->get(['id']);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function fillable(array $data): array
    {
        return array_intersect_key($data, array_flip((new Task)->getFillable()));
    }

    private function fail(string $key, string $message): never
    {
        throw ValidationException::withMessages([$key => $message]);
    }
}
