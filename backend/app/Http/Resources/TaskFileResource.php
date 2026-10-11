<?php

namespace App\Http\Resources;

use App\Models\TaskFile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A file attached to a task (a task Files tab tile) — mirrors ProjectFileResource: the link's id
 * (to detach) and the media.
 *
 * @mixin TaskFile
 */
class TaskFileResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'task_id' => $this->task_id,
            'media' => new MediaResource($this->whenLoaded('media')),
            'attached_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
