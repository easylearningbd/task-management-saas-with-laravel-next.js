<?php

namespace App\Http\Resources;

use App\Models\Task;
use App\Services\ProfileService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;

/**
 * A task as a card, a row and the details page show it — display-ready, so the UI computes
 * nothing: the labels, the stage (name, colour, done flag), the project and milestone names,
 * `is_overdue` (business rule 5: due before today and not in a done stage), the checklist
 * summary and the creator. Never the owner. `files_count` appears when counted (details).
 * The relations come from TaskService::query() / loadDetails() — eager-loaded, no N+1.
 *
 * @mixin Task
 */
class TaskResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $stage = $this->whenLoaded('stage');

        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'project_id' => $this->project_id,
            'project' => $this->whenLoaded('project', fn () => $this->project ? ['id' => $this->project->id, 'name' => $this->project->name] : null),
            'milestone_id' => $this->milestone_id,
            'milestone' => $this->whenLoaded('milestone', fn () => $this->milestone ? ['id' => $this->milestone->id, 'title' => $this->milestone->title] : null),
            'task_stage_id' => $this->task_stage_id,
            'stage' => $this->whenLoaded('stage', fn () => [
                'id' => $this->stage->id,
                'name' => $this->stage->name,
                'color' => $this->stage->color,
                'is_done_stage' => $this->stage->is_done_stage,
            ]),
            'start_date' => $this->start_date?->toDateString(),
            'due_date' => $this->due_date?->toDateString(),
            'priority' => $this->priority->value,
            'priority_label' => $this->priority->label(),
            'progress' => $this->progress,
            'position' => $this->position,
            'completed_at' => $this->completed_at?->toIso8601String(),
            'is_overdue' => $this->whenLoaded('stage', fn () => $this->due_date !== null
                && $this->due_date->lt(Carbon::today())
                && ! $this->stage->is_done_stage),
            'checklist_summary' => [
                'total' => (int) ($this->checklist_items_count ?? 0),
                'completed' => (int) ($this->checklist_completed_count ?? 0),
            ],
            'files_count' => $this->whenCounted('files'),
            'created_by' => $this->whenLoaded('creator', fn () => $this->creator ? [
                'id' => $this->creator->id,
                'name' => $this->creator->name,
                'email' => $this->creator->email,
                'avatar' => $this->creator->avatar ? Storage::disk(ProfileService::AVATAR_DISK)->url($this->creator->avatar) : null,
            ] : null),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
