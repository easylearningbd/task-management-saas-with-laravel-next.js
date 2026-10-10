<?php

namespace App\Http\Resources;

use App\Enums\MilestoneStatus;
use App\Models\Milestone;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Carbon;

/**
 * A milestone as the Milestones tab and Milestone Progress need it: dates `YYYY-MM-DD`, the
 * status label, and `is_overdue` (due before today and not completed).
 *
 * @mixin Milestone
 */
class MilestoneResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'title' => $this->title,
            'description' => $this->description,
            'start_date' => $this->start_date?->toDateString(),
            'due_date' => $this->due_date?->toDateString(),
            'progress' => $this->progress,
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'is_overdue' => $this->due_date !== null
                && $this->due_date->lt(Carbon::today())
                && $this->status !== MilestoneStatus::Completed,
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
