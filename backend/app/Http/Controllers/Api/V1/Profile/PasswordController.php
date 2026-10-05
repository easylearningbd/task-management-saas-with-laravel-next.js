<?php

namespace App\Http\Controllers\Api\V1\Profile;

use App\Http\Controllers\Controller;
use App\Http\Requests\Profile\UpdatePasswordRequest;
use App\Services\ProfileService;
use Illuminate\Http\Response;

/** PUT /api/v1/profile/password — change the signed-in user's password (both roles). */
class PasswordController extends Controller
{
    public function __invoke(UpdatePasswordRequest $request, ProfileService $profiles): Response
    {
        $profiles->updatePassword($request->user(), $request->validated('password'));

        return response()->noContent();
    }
}
