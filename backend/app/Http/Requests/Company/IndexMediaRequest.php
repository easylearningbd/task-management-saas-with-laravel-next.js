<?php

namespace App\Http\Requests\Company;

use App\Http\Requests\IndexRequest;
use App\Models\Media;
use Illuminate\Database\Query\Expression;

/**
 * GET /api/v1/media — the Media Library: search by filename, newest first, paginated. The picker
 * shows a grid, so a page is 18 tiles (three rows of six) unless `per_page` says otherwise.
 */
class IndexMediaRequest extends IndexRequest
{
    public const DEFAULT_TILES = 18;

    public function authorize(): bool
    {
        return $this->user()->can('viewAny', Media::class);
    }

    /**
     * @return array<string, string|Expression>
     */
    public function sortable(): array
    {
        return [
            'created_at' => 'media.created_at',
            'original_name' => 'media.original_name',
            'size_bytes' => 'media.size_bytes',
        ];
    }

    public function defaultSort(): string
    {
        return 'media.id';
    }

    public function defaultDirection(): string
    {
        return 'desc';
    }

    public function perPage(): int
    {
        return (int) ($this->validated('per_page') ?? self::DEFAULT_TILES);
    }

    /**
     * @return array{search: ?string}
     */
    public function filters(): array
    {
        return ['search' => $this->search()];
    }
}
