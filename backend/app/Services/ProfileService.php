<?php

namespace App\Services;

use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

/**
 * Self-service account changes. Every method acts on the user passed in — callers pass the
 * authenticated user, so nobody can change another account through these endpoints.
 */
class ProfileService
{
    public const AVATAR_DISK = 'public';

    public const AVATAR_DIRECTORY = 'avatars';

    /**
     * @param  array{name: string, email: string}  $data
     */
    public function update(User $user, array $data): User
    {
        $user->fill(['name' => $data['name'], 'email' => $data['email']]);

        // A new address has not been verified yet (no effect until MustVerifyEmail is enabled).
        if ($user->isDirty('email')) {
            $user->email_verified_at = null;
        }

        $user->save();

        return $user;
    }

    /**
     * Store the new avatar first, then delete the old file, so a failed upload never leaves
     * the account without one.
     */
    public function replaceAvatar(User $user, UploadedFile $file): User
    {
        $previous = $user->avatar;

        $user->avatar = $file->store(self::AVATAR_DIRECTORY, self::AVATAR_DISK);
        $user->save();

        if ($previous && $previous !== $user->avatar) {
            Storage::disk(self::AVATAR_DISK)->delete($previous);
        }

        return $user;
    }

    /**
     * Pass the authenticated user instance: Sanctum's AuthenticateSession then re-stores this
     * session's password hash after the request, so the current session stays signed in while
     * every other session for this account is signed out on its next request.
     */
    public function updatePassword(User $user, string $password): void
    {
        $user->password = $password; // hashed by the model cast
        $user->save();
    }
}
