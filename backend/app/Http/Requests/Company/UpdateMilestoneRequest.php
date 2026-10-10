<?php

namespace App\Http\Requests\Company;

use App\Models\Milestone;

/**
 * PUT /api/v1/milestones/{milestone} — the Edit Milestone form: the same rules as Add. The
 * route-bound milestone is already limited to the current company (BelongsToCompany); the
 * policy checks ownership again.
 */
class UpdateMilestoneRequest extends StoreMilestoneRequest
{
    public function authorize(): bool
    {
        $milestone = $this->route('milestone');

        return $milestone instanceof Milestone && $this->user()->can('update', $milestone);
    }
}
