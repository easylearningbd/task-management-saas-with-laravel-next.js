<?php

namespace App\Http\Requests\Admin;

/**
 * Same rules as creating (PUT sends the whole form); the unique-name rule already ignores
 * the plan being updated via the `{plan}` route parameter.
 */
class UpdatePlanRequest extends StorePlanRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('plan'));
    }
}
