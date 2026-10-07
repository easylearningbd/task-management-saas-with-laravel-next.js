<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\IndexActivityRequest;
use App\Http\Resources\CompanyActivityResource;
use App\Services\CompanyService;
use App\Support\ListQuery;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

/** GET /api/v1/admin/activities — every company's activity, newest first (the header history button). */
class ActivityController extends Controller
{
    public function __construct(private readonly CompanyService $companies) {}

    public function __invoke(IndexActivityRequest $request): AnonymousResourceCollection
    {
        return CompanyActivityResource::collection(
            ListQuery::paginate($this->companies->activityQuery(null, $request->validated('action')), $request),
        );
    }
}
