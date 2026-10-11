<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A media file attached to a task (the task Files tab) — mirrors ProjectFile. The link only:
 * detaching deletes this row and leaves the media in the library. Written by TaskFileService:
 * nothing is mass-assignable, `attached_by` is the signed-in user.
 *
 * @property int $id
 * @property int $company_id
 * @property int $task_id
 * @property int $media_id
 * @property int|null $attached_by
 */
class TaskFile extends Model
{
    use BelongsToCompany;

    protected $fillable = [];

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }

    public function media(): BelongsTo
    {
        return $this->belongsTo(Media::class);
    }
}
