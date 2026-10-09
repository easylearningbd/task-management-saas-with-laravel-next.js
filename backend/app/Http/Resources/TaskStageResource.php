<?php

namespace App\Http\Resources;

use App\Models\TaskStage;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A task stage as the workflow list, the form and the details modal need it. `color` is always
 * uppercase `#RRGGBB`; `status_label` is derived here so the UI never re-derives it.
 * `tasks_count` is set by TaskStageService::withTaskCounts() (0 until the Tasks module —
 * see the TODO there). `company_id` is not exposed: it is always the signed-in company.
 *
 * @mixin TaskStage
 */
class TaskStageResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'description' => $this->description,
            'color' => $this->color,
            'order' => $this->order,
            'is_done_stage' => $this->is_done_stage,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'tasks_count' => (int) $this->getAttribute('tasks_count'),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
