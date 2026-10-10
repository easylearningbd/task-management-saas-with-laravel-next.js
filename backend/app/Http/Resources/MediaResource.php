<?php

namespace App\Http\Resources;

use App\Models\Media;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A media library tile: display name, type, size, whether it previews as an image, and the two
 * URLs of the authenticated file route — `url` (inline, for thumbnails) and `download_url`.
 * The stored path and disk are never exposed.
 *
 * @mixin Media
 */
class MediaResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'original_name' => $this->original_name,
            'mime_type' => $this->mime_type,
            'extension' => $this->extension,
            'type_label' => $this->type_label,
            'is_image' => $this->is_image,
            'size_bytes' => $this->size_bytes,
            'url' => route('v1.media.file', $this->resource),
            'download_url' => route('v1.media.file', ['media' => $this->resource, 'download' => 1]),
            'created_at' => $this->created_at?->toIso8601String(),
        ];
    }
}
