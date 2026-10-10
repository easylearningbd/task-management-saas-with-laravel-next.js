<?php

namespace App\Http\Resources;

use App\Models\ProjectFile;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A file attached to a project (a Files tab tile): the link's id (to detach) and the media.
 *
 * @mixin ProjectFile
 */
class ProjectFileResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'project_id' => $this->project_id,
            'media' => new MediaResource($this->whenLoaded('media')),
            'attached_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
