<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Database\Factories\MediaFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

/**
 * A file in the company's media library. Every column is written by MediaService from what the
 * server saw — the stored path and extension come from the detected content type, never from
 * the client's filename; `original_name` is display-only. Nothing is mass-assignable.
 *
 * @property int $id
 * @property int $company_id
 * @property string $disk
 * @property string $path
 * @property string $original_name
 * @property string $mime_type
 * @property string $extension
 * @property int $size_bytes
 * @property int|null $uploaded_by
 */
class Media extends Model
{
    /** @use HasFactory<MediaFactory> */
    use BelongsToCompany, HasFactory, SoftDeletes;

    protected $table = 'media';

    protected $fillable = [];

    protected function casts(): array
    {
        return [
            'size_bytes' => 'integer',
        ];
    }

    public function uploader(): BelongsTo
    {
        return $this->belongsTo(User::class, 'uploaded_by')->withTrashed();
    }

    /** The projects this file is attached to (the links, not the projects). */
    public function projectFiles(): HasMany
    {
        return $this->hasMany(ProjectFile::class);
    }

    /** The original filename contains the term (LIKE-escaped). */
    public function scopeSearch(Builder $query, ?string $term): void
    {
        $term = trim((string) $term);
        if ($term === '') {
            return;
        }

        $like = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $term).'%';
        $query->whereRaw("media.original_name like ? escape '!'", [$like]);
    }

    /** Images get a thumbnail; everything else a typed tile. */
    protected function isImage(): Attribute
    {
        return Attribute::get(fn (): bool => Str::startsWith($this->mime_type, 'image/'));
    }

    /** The tile label for non-images: the extension in capitals ("PDF", "DOCX"). */
    protected function typeLabel(): Attribute
    {
        return Attribute::get(fn (): string => Str::upper($this->extension));
    }
}
