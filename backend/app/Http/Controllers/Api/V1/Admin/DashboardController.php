<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

/** Placeholder until the admin dashboard milestone — proves the super_admin route guard. */
class DashboardController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json(['message' => 'Admin dashboard']);
    }
}
