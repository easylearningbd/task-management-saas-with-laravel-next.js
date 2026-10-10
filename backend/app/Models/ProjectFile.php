<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * A media file attached to a project (the Files tab). The link only — detaching deletes this
 * row and leaves the media in the library. Written by ProjectFileService: nothing is
 * mass-assignable, `attached_by` is the signed-in user.
 *
 * @property int $id
 * @property int $company_id
 * @property int $project_id
 * @property int $media_id
 * @property int|null $attached_by
 */
class ProjectFile extends Model
{
    use BelongsToCompany;

    protected $fillable = [];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    public function media(): BelongsTo
    {
        return $this->belongsTo(Media::class);
    }
}
