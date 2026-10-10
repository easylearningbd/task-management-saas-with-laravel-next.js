<?php

namespace App\Http\Resources;

use App\Models\Project;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A project as the list, the grid and the form need it — display-ready, so the UI computes
 * nothing: labels, the client's name / email / initials, `progress` (set by
 * ProjectService::withProgress — 0 until tasks exist, TODO(tasks) there) and `can_toggle`
 * (the lock only switches Active ⇄ Inactive). Dates are `YYYY-MM-DD`; money is a decimal
 * string. `company_id` is never exposed.
 *
 * @mixin Project
 */
class ProjectResource extends JsonResource
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
            'client' => $this->whenLoaded('client', fn () => $this->client ? [
                'id' => $this->client->id,
                'name' => $this->client->name,
                'email' => $this->client->email,
                'initials' => $this->client->initials,
            ] : null),
            'client_id' => $this->client_id,
            'start_date' => $this->start_date?->toDateString(),
            'end_date' => $this->end_date?->toDateString(),
            'budget' => $this->budget,
            'priority' => $this->priority->value,
            'priority_label' => $this->priority->label(),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'can_toggle' => $this->status->toggled() !== null,
            'progress' => (int) $this->getAttribute('progress'),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
