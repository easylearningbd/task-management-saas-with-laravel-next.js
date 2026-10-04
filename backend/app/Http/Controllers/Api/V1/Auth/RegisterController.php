<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Requests\Auth\RegisterRequest;
use App\Http\Resources\UserResource;
use App\Services\AuthService;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpFoundation\Response;

/** POST /api/v1/auth/register — creates a company account and logs it in. */
class RegisterController extends Controller
{
    public function __invoke(RegisterRequest $request, AuthService $auth): JsonResponse
    {
        $user = $auth->registerCompany($request->validated(), $request);

        return (new UserResource($user))->response()->setStatusCode(Response::HTTP_CREATED);
    }
}
