<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\IndexCouponRequest;
use App\Http\Requests\Admin\StoreCouponRequest;
use App\Http\Requests\Admin\UpdateCouponRequest;
use App\Http\Resources\CouponResource;
use App\Models\Coupon;
use App\Services\CouponService;
use App\Support\ListQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * /api/v1/admin/coupons — Super Admin coupon management. Thin: Form Requests validate and
 * authorize, CouponService holds every business rule, CouponResource shapes output.
 */
class CouponController extends Controller
{
    public function __construct(private readonly CouponService $coupons) {}

    /** Paginated, searchable, filterable, sortable list (standard Laravel pagination meta). */
    public function index(IndexCouponRequest $request): AnonymousResourceCollection
    {
        return CouponResource::collection(
            ListQuery::paginate($this->coupons->query($request->filters()), $request),
        );
    }

    public function store(StoreCouponRequest $request): JsonResponse
    {
        $coupon = $this->coupons->create($request->validated());

        return (new CouponResource($coupon))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Coupon $coupon): CouponResource
    {
        Gate::authorize('view', $coupon);

        return new CouponResource($coupon);
    }

    public function update(UpdateCouponRequest $request, Coupon $coupon): CouponResource
    {
        return new CouponResource($this->coupons->update($coupon, $request->validated()));
    }

    public function destroy(Coupon $coupon): Response
    {
        Gate::authorize('delete', $coupon);

        $this->coupons->delete($coupon);

        return response()->noContent();
    }

    /** PATCH /api/v1/admin/coupons/{coupon}/toggle-status */
    public function toggleStatus(Coupon $coupon): CouponResource
    {
        Gate::authorize('update', $coupon);

        return new CouponResource($this->coupons->toggleStatus($coupon));
    }

    /** GET /api/v1/admin/coupons/generate-code — a fresh unique code for the Auto Generate radio. */
    public function generateCode(): JsonResponse
    {
        Gate::authorize('create', Coupon::class);

        return response()->json(['data' => ['code' => $this->coupons->generateUniqueCode()]]);
    }
}
