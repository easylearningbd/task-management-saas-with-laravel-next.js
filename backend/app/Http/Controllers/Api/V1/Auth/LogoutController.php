<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Services\AuthService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/** POST /api/v1/auth/logout — both roles. */
class LogoutController extends Controller
{
    public function __invoke(Request $request, AuthService $auth): Response
    {
        $auth->logout($request);

        return response()->noContent();
    }
}
