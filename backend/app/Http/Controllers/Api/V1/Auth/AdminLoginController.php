<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Enums\UserType;
use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\LoginRequest;
use App\Http\Resources\UserResource;
use App\Services\AuthService;

/** POST /api/v1/admin/auth/login — super admin accounts only. */
class AdminLoginController extends Controller
{
    public function __invoke(LoginRequest $request, AuthService $auth): UserResource
    {
        return new UserResource($auth->login($request, UserType::SuperAdmin));
    }
}
