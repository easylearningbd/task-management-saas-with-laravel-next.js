<?php

namespace App\Http\Controllers\Api\V1\Profile;

use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\UpdateAvatarRequest;
use App\Http\Resources\UserResource;
use App\Services\ProfileService;

/** POST /api/v1/profile/avatar — replace the signed-in user's avatar (both roles). */
class AvatarController extends Controller
{
    public function __invoke(UpdateAvatarRequest $request, ProfileService $profiles): UserResource
    {
        return new UserResource($profiles->replaceAvatar($request->user(), $request->file('avatar')));
    }
}
