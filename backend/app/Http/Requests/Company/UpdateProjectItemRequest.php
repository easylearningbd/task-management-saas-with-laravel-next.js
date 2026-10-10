<?php

namespace App\Http\Requests\Company;

use App\Models\ProjectItem;

/** PUT /api/v1/project-items/{item} — the same rules as Add Item. */
class UpdateProjectItemRequest extends StoreProjectItemRequest
{
    public function authorize(): bool
    {
        $item = $this->route('item');

        return $item instanceof ProjectItem && $this->user()->can('update', $item);
    }
}
