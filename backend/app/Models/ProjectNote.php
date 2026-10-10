<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Database\Factories\ProjectNoteFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A note on a project (the Notes tab). `created_by` is set by ProjectNoteService from the
 * signed-in user — not fillable, never read from input.
 *
 * @property int $id
 * @property int $company_id
 * @property int $project_id
 * @property string $title
 * @property string $content
 * @property int|null $created_by
 */
class ProjectNote extends Model
{
    /** @use HasFactory<ProjectNoteFactory> */
    use BelongsToCompany, HasFactory, SoftDeletes;

    protected $fillable = ['title', 'content'];

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /** Who wrote it (shown as the author badge); kept even if that user was deleted. */
    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by')->withTrashed();
    }
}
