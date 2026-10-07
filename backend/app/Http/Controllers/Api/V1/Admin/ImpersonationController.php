<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Resources\UserResource;
use App\Models\Company;
use App\Services\ImpersonationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

/**
 * POST /api/v1/admin/companies/{company}/impersonate — "Login as company". `{company}` binds
 * through the Company model, so a super admin (or a deleted company) is a 404. Returns the new
 * session user (the company, with `is_impersonating: true`).
 */
class ImpersonationController extends Controller
{
    public function __invoke(Request $request, Company $company, ImpersonationService $impersonation): UserResource
    {
        Gate::authorize('impersonate', $company);

        return new UserResource($impersonation->start($request, $request->user(), $company));
    }
}
