<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Http\Controllers\Controller;
use App\Http\Resources\TaxResource;
use App\Models\Tax;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Gate;

/**
 * GET /api/v1/taxes — the company's active tax rates (the invoice form's Tax options), by name.
 * A short reference list, not paginated. Managing taxes comes with the Settings / Items pages.
 */
class TaxController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        Gate::authorize('viewAny', Tax::class);

        return TaxResource::collection(Tax::query()->active()->orderBy('name')->get());
    }
}
