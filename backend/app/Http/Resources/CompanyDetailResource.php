<?php

namespace App\Http\Resources;

use App\Models\Company;
use App\Services\CompanyService;
use Illuminate\Http\Request;

/**
 * GET /api/v1/admin/companies/{company} — the details page payload: the row, plus the plan's
 * limits, current usage, whether a password was ever set (Enable Login needs one) and the
 * latest activity (load `recentActivities` first).
 *
 * @mixin Company
 */
class CompanyDetailResource extends CompanyResource
{
    /** How many log entries the details page shows before "View all". */
    public const RECENT_ACTIVITY = 5;

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            ...parent::toArray($request),
            'plan' => $this->plan ? [
                'id' => $this->plan->id,
                'name' => $this->plan->name,
                'monthly_price' => $this->plan->monthly_price,
                'yearly_price' => $this->plan->yearly_price,
            ] : null,
            'limits' => [
                'max_projects' => $this->max_projects, // -1 = unlimited, null = no plan
                'storage_limit_gb' => $this->storage_limit_gb,
            ],
            // TODO(usage): projects and uploads don't exist yet — these are honest zeros, not
            // estimates. Count the company's projects / sum its file sizes once those modules land.
            'usage' => [
                'projects' => 0,
                'storage_bytes' => 0,
            ],
            'has_password' => app(CompanyService::class)->hasUsablePassword($this->resource),
            'recent_activities' => CompanyActivityResource::collection(
                $this->resource->activities()->with('actor')->limit(self::RECENT_ACTIVITY)->get(),
            ),
        ];
    }
}
