<?php

namespace App\Services;

use App\Enums\TaskStageStatus;
use App\Models\TaskStage;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Task stage business logic (PRD §6.13) — every rule lives here, inside transactions that lock
 * the company's stages first, so two requests can never interleave a renumbering:
 *
 *  1. Exactly one done stage per company. Marking a stage done unsets every other one.
 *  2. The done stage is never left unset: it can't be unset, deleted or deactivated (each with
 *     its own message). Marking a stage done also makes it active — a done stage is never inactive.
 *  3. `order` stays contiguous 1..n. Create appends (no order) or inserts at a position (later
 *     stages move down); an edit can move a stage; delete closes the gap; reorder rewrites the
 *     whole sequence. Positions past the end mean "at the end".
 *  4. Name uniqueness is the requests' job (case-insensitive, within the company).
 *  5. Status toggle refuses the done stage and the last active stage.
 *  6. Delete is soft, with the extension point for "a stage with tasks can't be deleted".
 *
 * Rule violations are 422s under the `stage` key — not a form field, so the UI shows them as a
 * form-level message. Tenancy is the model's (BelongsToCompany): nothing here takes or sets a
 * `company_id`, and every query sees the current company's stages only.
 */
class TaskStageService
{
    public const ERROR_KEY = 'stage';

    /**
     * The list query: search (name, description), status and created-date filters, in
     * workflow order. Not paginated — stages are few, and reordering needs all of them.
     *
     * @param  array{search?: ?string, status?: ?string, created_from?: ?string, created_to?: ?string}  $filters
     * @return Builder<TaskStage>
     */
    public function query(array $filters): Builder
    {
        return TaskStage::query()
            ->search($filters['search'] ?? null)
            ->ofStatus($filters['status'] ?? null)
            ->when($filters['created_from'] ?? null, fn (Builder $q, string $from) => $q->whereDate('task_stages.created_at', '>=', $from))
            ->when($filters['created_to'] ?? null, fn (Builder $q, string $to) => $q->whereDate('task_stages.created_at', '<=', $to))
            ->ordered();
    }

    /**
     * Sets `tasks_count` on each stage.
     *
     * @param  Collection<int, TaskStage>  $stages
     * @return Collection<int, TaskStage>
     */
    public function withTaskCounts(Collection $stages): Collection
    {
        // TODO(tasks): the tasks table doesn't exist yet, so every stage honestly has 0 tasks.
        // When it lands, load real counts with `->withCount('tasks')` on the list query (see
        // TaskStage::tasks()) and delete this method.
        return $stages->each(fn (TaskStage $stage) => $stage->setAttribute('tasks_count', 0));
    }

    /**
     * The stat cards: totals, and the done stage's name.
     *
     * @return array{total: int, active: int, inactive: int, done_stage: ?array{id: int, name: string}}
     */
    public function stats(): array
    {
        $counts = TaskStage::query()
            ->selectRaw('COUNT(*) as total')
            ->selectRaw('SUM(CASE WHEN task_stages.status = ? THEN 1 ELSE 0 END) as active', [TaskStageStatus::Active->value])
            ->first();
        $done = TaskStage::query()->where('is_done_stage', true)->first(['id', 'name']);
        $total = (int) $counts?->getAttribute('total');
        $active = (int) $counts?->getAttribute('active');

        return [
            'total' => $total,
            'active' => $active,
            'inactive' => $total - $active,
            'done_stage' => $done ? ['id' => $done->id, 'name' => $done->name] : null,
        ];
    }

    /**
     * A new stage at `order` (null = at the end), or — when the company once had a stage of this
     * name and deleted it — that row brought back with the new values (Phase 0 decision 5; the
     * (company_id, name) index covers deleted rows, so a plain insert would collide).
     *
     * @param  array<string, mixed>  $data  validated name, description, color, order, status, is_done_stage
     */
    public function create(array $data): TaskStage
    {
        return DB::transaction(function () use ($data): TaskStage {
            $this->lock();
            $makeDone = (bool) ($data['is_done_stage'] ?? false);
            $status = $this->statusFor($data['status'] ?? null, $makeDone);

            $values = [
                'name' => $data['name'],
                'description' => $data['description'] ?? null,
                'color' => $data['color'],
                'status' => $status,
                'is_done_stage' => false, // moved in below, after the stage has its place
                'order' => TaskStage::query()->count() + 1,
            ];

            $stage = TaskStage::onlyTrashed()->named($data['name'])->first();
            if ($stage) {
                $stage->fill($values);
                $stage->created_at = $stage->freshTimestamp(); // it is "added" again, now
                $stage->restore();
            } else {
                $stage = TaskStage::create($values);
            }

            $this->place($stage, $data['order'] ?? null);
            if ($makeDone) {
                $this->makeDone($stage);
            }

            return $stage->refresh();
        });
    }

    /**
     * @param  array<string, mixed>  $data  validated; `order` and `is_done_stage` only when sent
     */
    public function update(TaskStage $stage, array $data): TaskStage
    {
        return DB::transaction(function () use ($stage, $data): TaskStage {
            $this->lock();
            $stage->refresh();

            $makeDone = array_key_exists('is_done_stage', $data) ? (bool) $data['is_done_stage'] : $stage->is_done_stage;
            if ($stage->is_done_stage && ! $makeDone) {
                $this->fail(__('The done stage can\'t be unset. Mark another stage as the done stage instead.'));
            }

            // No status sent: keep the current one — unless the stage becomes done, which activates it.
            $requested = array_key_exists('status', $data) ? $data['status'] : ($makeDone ? null : $stage->status->value);
            $status = $this->statusFor($requested, $makeDone);
            if ($status === TaskStageStatus::Inactive && $stage->status === TaskStageStatus::Active) {
                $this->ensureCanDeactivate($stage);
            }

            $stage->fill([
                'name' => $data['name'] ?? $stage->name,
                'description' => array_key_exists('description', $data) ? $data['description'] : $stage->description,
                'color' => $data['color'] ?? $stage->color,
                'status' => $status,
            ])->save();

            if (($data['order'] ?? null) !== null && (int) $data['order'] !== $stage->order) {
                $this->place($stage, (int) $data['order']);
            }
            if ($makeDone && ! $stage->is_done_stage) {
                $this->makeDone($stage);
            }

            return $stage->refresh();
        });
    }

    /**
     * Rewrites the whole sequence: `$ids` must be exactly the company's stages, each once.
     *
     * @param  list<int>  $ids  in the new order
     * @return Collection<int, TaskStage>
     */
    public function reorder(array $ids): Collection
    {
        return DB::transaction(function () use ($ids): Collection {
            $this->lock();
            $current = TaskStage::query()->pluck('id')->map(fn ($id) => (int) $id)->sort()->values()->all();
            $given = collect($ids)->map(fn ($id) => (int) $id);

            if ($given->duplicates()->isNotEmpty() || $given->sort()->values()->all() !== $current) {
                throw ValidationException::withMessages([
                    'ids' => __('Send every one of your stages exactly once, in the new order.'),
                ]);
            }

            $this->writeSequence($given->all());

            return $this->withTaskCounts(TaskStage::query()->ordered()->get());
        });
    }

    /** Active ↔ Inactive — never deactivating the done stage or the last active stage. */
    public function toggleStatus(TaskStage $stage): TaskStage
    {
        return DB::transaction(function () use ($stage): TaskStage {
            $this->lock();
            $stage->refresh();

            if ($stage->status === TaskStageStatus::Active) {
                $this->ensureCanDeactivate($stage);
            }
            $stage->status = $stage->status->toggled();
            $stage->save();

            return $stage;
        });
    }

    /** Soft delete, then the stages after it move up (no gaps). Never the done stage. */
    public function delete(TaskStage $stage): void
    {
        DB::transaction(function () use ($stage): void {
            $this->lock();
            $stage->refresh();

            if ($stage->is_done_stage) {
                $this->fail(__('The done stage can\'t be deleted. Mark another stage as the done stage first.'));
            }
            $this->ensureDeletable($stage);

            $stage->delete();
            $this->writeSequence(TaskStage::query()->ordered()->pluck('id')->all());
        });
    }

    /**
     * EXTENSION POINT — PRD §6.13: "a stage with tasks cannot be deleted (move tasks first)".
     * The Tasks module doesn't exist yet, so no stage has tasks and every non-done stage is
     * deletable. When it lands (see TaskStage::tasks()), throw here, e.g.:
     *
     *     if ($stage->tasks()->exists()) {
     *         $this->fail(__('This stage has tasks. Move them to another stage first.'));
     *     }
     *
     * and add the matching tests. Deliberately not faked before then.
     */
    private function ensureDeletable(TaskStage $stage): void
    {
        // Intentionally empty until the Tasks module exists.
    }

    /** Last-active first: when the done stage is the only active one, that is the real reason. */
    private function ensureCanDeactivate(TaskStage $stage): void
    {
        if (! TaskStage::query()->active()->whereKeyNot($stage->getKey())->exists()) {
            $this->fail(__('At least one stage must stay active.'));
        }
        if ($stage->is_done_stage) {
            $this->fail(__('The done stage can\'t be deactivated. Mark another stage as the done stage first.'));
        }
    }

    /** A done stage is always active: asking for both "done" and "inactive" is refused. */
    private function statusFor(?string $requested, bool $done): TaskStageStatus
    {
        $status = $requested !== null ? TaskStageStatus::from($requested) : TaskStageStatus::Active;
        if ($done && $status === TaskStageStatus::Inactive) {
            $this->fail(__('The done stage must be active.'));
        }

        return $done ? TaskStageStatus::Active : $status;
    }

    /** The done flag moves here; every other stage loses it. */
    private function makeDone(TaskStage $stage): void
    {
        TaskStage::query()->whereKeyNot($stage->getKey())->where('is_done_stage', true)->update(['is_done_stage' => false]);
        $stage->forceFill(['is_done_stage' => true, 'status' => TaskStageStatus::Active])->save();
    }

    /** Puts `$stage` at position `$order` (1-based; null or past the end = last). */
    private function place(TaskStage $stage, ?int $order): void
    {
        $others = TaskStage::query()->whereKeyNot($stage->getKey())->ordered()->pluck('id')->all();
        $position = $order === null ? count($others) : max(0, min($order - 1, count($others)));
        array_splice($others, $position, 0, [$stage->getKey()]);

        $this->writeSequence($others);
    }

    /**
     * Orders 1..n in the given id order — only the rows whose order actually changes are written.
     *
     * @param  array<int, int>  $ids
     */
    private function writeSequence(array $ids): void
    {
        foreach (array_values($ids) as $index => $id) {
            TaskStage::query()->whereKey($id)->where('order', '!=', $index + 1)->update(['order' => $index + 1]);
        }
    }

    /** Locks the company's stages for the rest of the transaction (MySQL; a no-op on SQLite). */
    private function lock(): void
    {
        TaskStage::query()->lockForUpdate()->get(['id']);
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages([self::ERROR_KEY => $message]);
    }
}
