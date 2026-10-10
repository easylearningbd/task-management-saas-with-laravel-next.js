<?php

namespace App\Http\Requests\Company;

use App\Models\ProjectNote;

/** PUT /api/v1/project-notes/{note} — the same rules as Add Note; the author stays the original. */
class UpdateProjectNoteRequest extends StoreProjectNoteRequest
{
    public function authorize(): bool
    {
        $note = $this->route('note');

        return $note instanceof ProjectNote && $this->user()->can('update', $note);
    }
}
