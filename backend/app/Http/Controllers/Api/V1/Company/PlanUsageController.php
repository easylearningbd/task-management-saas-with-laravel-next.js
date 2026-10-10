<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Http\Controllers\Controller;
use App\Services\PlanLimitService;
use Illuminate\Http\JsonResponse;

/**
 * GET /api/v1/plan-usage — the signed-in company's plan and its usage against the allowance
 * (projects used / limit, storage bytes used / limit, AI). The UI shows it (the Media Library
 * meter, the project limit hint); the limits themselves are enforced by PlanLimitService.
 */
class PlanUsageController extends Controller
{
    public function __invoke(PlanLimitService $limits): JsonResponse
    {
        return response()->json(['data' => $limits->usage()]);
    }
}
