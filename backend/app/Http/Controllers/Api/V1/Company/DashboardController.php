<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;

/** Placeholder until the company dashboard milestone — proves the company route guard. */
class DashboardController extends Controller
{
    public function __invoke(): JsonResponse
    {
        return response()->json(['message' => 'Company dashboard']);
    }
}
