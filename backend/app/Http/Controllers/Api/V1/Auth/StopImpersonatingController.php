<?php

namespace App\Http\Controllers\Api\V1\Auth;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Services\ImpersonationService;
use Illuminate\Http\Request;

/**
 * POST /api/v1/stop-impersonating — "Back to Admin". Called by the impersonated (company)
 * session; the admin comes from the server-side session only. 403 when not impersonating.
 */
class StopImpersonatingController extends Controller
{
    public function __invoke(Request $request, ImpersonationService $impersonation): UserResource
    {
        return new UserResource($impersonation->stop($request));
    }
}
