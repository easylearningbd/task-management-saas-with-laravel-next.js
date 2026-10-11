<?php

namespace App\Http\Requests\Company;

use App\Enums\TaskPriority;
use App\Http\Requests\IndexRequest;
use App\Models\Task;
use Illuminate\Database\Query\Expression;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * GET /api/v1/tasks — `view=board` (default): every matching task grouped into the active stage
 * columns, not paginated; `view=list`: the paginated table. Both take search (title,
 * description), project, milestone, stage and priority. The list also takes sort (whitelist
 * below; anything else → 422 from IndexRequest), page and per_page (10, max 100).
 */
class IndexTaskRequest extends IndexRequest
{
    public const VIEWS = ['board', 'list'];

    public function authorize(): bool
    {
        return $this->user()->can('viewAny', Task::class);
    }

    /**
     * Priority sorts by meaning (Low → Urgent), not alphabet.
     *
     * @return array<string, string|Expression>
     */
    public function sortable(): array
    {
        return [
            'title' => 'tasks.title',
            'priority' => DB::raw("CASE tasks.priority WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 WHEN 'urgent' THEN 4 END"),
            'start_date' => 'tasks.start_date',
            'due_date' => 'tasks.due_date',
            'progress' => 'tasks.progress',
            'created_at' => 'tasks.created_at',
        ];
    }

    /** The list: soonest due first. */
    public function defaultSort(): string
    {
        return 'tasks.due_date';
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    protected function filterRules(): array
    {
        return [
            'view' => ['nullable', Rule::in(self::VIEWS)],
            'project_id' => ['nullable', 'integer', 'min:1'],
            'milestone_id' => ['nullable', 'integer', 'min:1'],
            'task_stage_id' => ['nullable', 'integer', 'min:1'],
            'priority' => ['nullable', Rule::enum(TaskPriority::class)],
        ];
    }

    public function view(): string
    {
        return $this->validated('view') ?? 'board';
    }

    /**
     * @return array{search: ?string, project_id: ?int, milestone_id: ?int, task_stage_id: ?int, priority: ?string}
     */
    public function filters(): array
    {
        $int = fn (string $key): ?int => $this->validated($key) === null ? null : (int) $this->validated($key);

        return [
            'search' => $this->search(),
            'project_id' => $int('project_id'),
            'milestone_id' => $int('milestone_id'),
            'task_stage_id' => $int('task_stage_id'),
            'priority' => $this->validated('priority'),
        ];
    }
}
