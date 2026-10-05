<?php

namespace App\Http\Controllers\Api\V1\Profile;

use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\UpdateProfileRequest;
use App\Http\Resources\UserResource;
use App\Services\ProfileService;
use Illuminate\Http\Request;

/** GET|PATCH /api/v1/profile — the signed-in user's own profile (both roles). */
class ProfileController extends Controller
{
    public function show(Request $request): UserResource
    {
        return new UserResource($request->user());
    }

    public function update(UpdateProfileRequest $request, ProfileService $profiles): UserResource
    {
        return new UserResource($profiles->update($request->user(), $request->validated()));
    }
}
