<?php

namespace App\Http\Resources;

use App\Models\ProjectItem;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A project item card: name, description, price (decimal string), unit and status with their
 * labels.
 *
 * @mixin ProjectItem
 */
class ProjectItemResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'name' => $this->name,
            'description' => $this->description,
            'default_price' => $this->default_price,
            'unit' => $this->unit->value,
            'unit_label' => $this->unit->label(),
            'status' => $this->status->value,
            'status_label' => $this->status->label(),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
