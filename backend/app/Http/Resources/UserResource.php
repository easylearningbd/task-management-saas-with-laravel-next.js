<?php

namespace App\Http\Resources;

use App\Models\User;
use App\Services\ImpersonationService;
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
            // Set while a super admin is viewing as this account ("Login as company").
            'is_impersonating' => $this->impersonator($request) !== null,
            'impersonator' => $this->impersonator($request),
        ];
    }

    /**
     * The admin behind the session when it is viewing as this user, else null.
     *
     * @return array{name: string, email: string}|null
     */
    private function impersonator(Request $request): ?array
    {
        $marker = ImpersonationService::impersonator($request);
        if ($marker === null || (int) $marker['id'] === (int) $this->id) {
            return null;
        }

        return ['name' => $marker['name'], 'email' => $marker['email']];
    }
}
