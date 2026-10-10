<?php

namespace App\Http\Resources;

use App\Models\Project;
use App\Support\Projects\ProjectFigures;
use Illuminate\Http\Request;

/**
 * GET /api/v1/projects/{project} — the project plus everything the details page header, the
 * summary cards, the tab bar and the Overview tab need: `figures` (ProjectService::figures —
 * tasks, progress, health, overdue, milestones, budget, contracts) and `counts` per tab.
 * Tasks- and contracts-derived numbers are honest zeros (TODO(tasks) / TODO(contracts) in
 * ProjectService); the contracts tab count is 0 for the same reason.
 *
 * Expects `figures` passed in and the tab counts loaded (milestones_count, items_count,
 * notes_count, expenses_count, files_count).
 *
 * @mixin Project
 */
class ProjectDetailResource extends ProjectResource
{
    public function __construct(Project $project, private readonly ProjectFigures $figures)
    {
        parent::__construct($project);
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            'progress' => $this->figures->progress,
            'figures' => $this->figures->toArray(),
            'counts' => [
                'milestones' => (int) $this->milestones_count,
                'items' => (int) $this->items_count,
                'notes' => (int) $this->notes_count,
                'expenses' => (int) $this->expenses_count,
                'files' => (int) $this->files_count,
                // TODO(contracts): the contracts table doesn't exist yet.
                'contracts' => 0,
            ],
        ];
    }
}
