<?php

namespace App\Http\Requests\Admin;

use App\Enums\CouponType;
use App\Http\Requests\IndexRequest;
use App\Models\Coupon;
use Illuminate\Contracts\Database\Query\Expression;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * GET /api/v1/admin/coupons — search (name or code), `type`, `status` (active | inactive) and
 * an inclusive `expiry_from` / `expiry_to` range, plus the shared list parameters.
 */
class IndexCouponRequest extends IndexRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('viewAny', Coupon::class);
    }

    /**
     * `type` is an ENUM: MySQL would order it by declaration (percentage, flat), so it is cast
     * to text to sort alphabetically on every database (flat < percentage).
     *
     * @return array<string, string|Expression>
     */
    public function sortable(): array
    {
        return [
            'name' => 'name',
            'code' => 'code',
            'type' => DB::raw('CAST(type AS CHAR)'),
            'expiry_date' => 'expiry_date',
            'created_at' => 'created_at',
        ];
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    protected function filterRules(): array
    {
        return [
            'type' => ['nullable', Rule::enum(CouponType::class)],
            'status' => ['nullable', Rule::in(['active', 'inactive'])],
            'expiry_from' => ['nullable', 'date_format:Y-m-d'],
            'expiry_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:expiry_from'],
        ];
    }

    /**
     * The validated filters, for CouponService::query().
     *
     * @return array{search: ?string, type: ?string, status: ?string, expiry_from: ?string, expiry_to: ?string}
     */
    public function filters(): array
    {
        return [
            'search' => $this->search(),
            'type' => $this->validated('type'),
            'status' => $this->validated('status'),
            'expiry_from' => $this->validated('expiry_from'),
            'expiry_to' => $this->validated('expiry_to'),
        ];
    }
}
