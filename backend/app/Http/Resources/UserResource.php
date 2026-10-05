<?php

namespace App\Http\Resources;

use App\Models\User;
use App\Services\ProfileService;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Support\Facades\Storage;

/**
 * @mixin User
 */
class UserResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->type->value,
            // Absolute URL on the public disk (http://localhost:8000/storage/…) so the SPA on
            // another origin can load it; the default disk is private and gives a relative path.
            'avatar' => $this->avatar ? Storage::disk(ProfileService::AVATAR_DISK)->url($this->avatar) : null,
            'status' => $this->status->value,
        ];
    }
}
