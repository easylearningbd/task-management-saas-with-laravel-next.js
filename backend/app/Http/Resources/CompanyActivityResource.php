<?php

namespace App\Http\Resources;

use App\Models\CompanyActivity;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * One audit-log entry: what happened (`action` + `action_label`), to which company, by whom
 * (null actor = system / seeder) and when.
 *
 * @mixin CompanyActivity
 */
class CompanyActivityResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'action' => $this->action->value,
            'action_label' => $this->action->label(),
            'description' => $this->description,
            'meta' => $this->meta,
            'company' => $this->whenLoaded('company', fn () => $this->company ? [
                'id' => $this->company->id,
                'name' => $this->company->name,
                'email' => $this->company->email,
                'deleted' => $this->company->trashed(),
            ] : null),
            'actor' => $this->whenLoaded('actor', fn () => $this->actor ? [
                'id' => $this->actor->id,
                'name' => $this->actor->name,
                'email' => $this->actor->email,
            ] : null),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
