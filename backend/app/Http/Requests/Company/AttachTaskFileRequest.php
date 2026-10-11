<?php

namespace App\Http\Requests\Company;

use App\Models\Task;

/**
 * POST /api/v1/tasks/{task}/files — attach a file of the company's media library to its own task;
 * the same rules and messages as the project Files tab.
 */
class AttachTaskFileRequest extends AttachProjectFileRequest
{
    public function authorize(): bool
    {
        $task = $this->route('task');

        return $task instanceof Task && $this->user()->can('update', $task);
    }
}
