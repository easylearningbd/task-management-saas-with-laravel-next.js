<?php

namespace App\Services;

use App\Models\Media;
use App\Models\User;
use App\Support\Tenancy\Tenancy;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use RuntimeException;
use Throwable;

/**
 * The company's media library (Phase 0 decisions 1–2). Files are stored on the private `local`
 * disk at `media/{company_id}/{uuid}.{ext}` and are only ever served through an authenticated,
 * tenant-scoped route — never by a public URL.
 *
 * Nothing about storage trusts the client: the content type is detected by the server from the
 * file's bytes, the extension is taken from that type (an allowlist), and the stored name is a
 * fresh UUID. The client's filename is kept as `original_name` for display only, cleaned of any
 * path. The size counts toward the plan's storage limit (PlanLimitService, checked before the
 * file is written).
 */
class MediaService
{
    public const DISK = 'local';

    public function __construct(private readonly PlanLimitService $limits) {}

    /** 10 MB per file (Phase 0 decision 2; php.ini must allow it — upload_max_filesize ≥ 12M). */
    public const MAX_BYTES = 10 * 1024 * 1024;

    /** Allowed content types → the extension stored on disk. */
    public const ALLOWED = [
        'image/jpeg' => 'jpg',
        'image/png' => 'png',
        'image/gif' => 'gif',
        'image/webp' => 'webp',
        'application/pdf' => 'pdf',
        'application/msword' => 'doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'docx',
        'application/vnd.ms-excel' => 'xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'xlsx',
        'application/vnd.ms-powerpoint' => 'ppt',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation' => 'pptx',
        'text/plain' => 'txt',
        'text/csv' => 'csv',
    ];

    /**
     * The library, newest first, optionally searched by filename.
     *
     * @param  array{search?: ?string}  $filters
     * @return Builder<Media>
     */
    public function query(array $filters): Builder
    {
        return Media::query()->search($filters['search'] ?? null)->orderByDesc('media.id');
    }

    /** Bytes used by the company's live media — the plan's storage figure. */
    public function usedBytes(): int
    {
        return (int) Media::query()->sum('size_bytes');
    }

    public function store(UploadedFile $file, User $uploadedBy): Media
    {
        $mime = (string) $file->getMimeType(); // detected from the bytes, not the client's claim
        $extension = self::ALLOWED[$mime] ?? null;
        if ($extension === null) {
            throw ValidationException::withMessages(['file' => __('This type of file can\'t be uploaded.')]);
        }

        $size = (int) $file->getSize();

        return DB::transaction(function () use ($file, $mime, $extension, $size, $uploadedBy): Media {
            // The plan's storage allowance — checked under the company lock before anything is
            // written, so concurrent uploads can't overshoot it. Throws PlanLimitReached (a 422).
            $this->limits->ensureCanStore($size);

            $companyId = Tenancy::instance()->requireCompanyId();
            $disk = Storage::disk(self::DISK);
            $path = $disk->putFileAs("media/{$companyId}", $file, Str::uuid()->toString().'.'.$extension);
            if ($path === false) {
                throw new RuntimeException('The file could not be stored.');
            }

            try {
                $media = new Media;
                $media->forceFill([
                    'disk' => self::DISK,
                    'path' => $path,
                    'original_name' => self::displayName($file->getClientOriginalName(), $extension),
                    'mime_type' => $mime,
                    'extension' => $extension,
                    'size_bytes' => $size,
                    'uploaded_by' => $uploadedBy->getKey(),
                ])->save();

                return $media;
            } catch (Throwable $e) {
                $disk->delete($path); // never leave an orphan file behind a failed insert

                throw $e;
            }
        });
    }

    /**
     * Removes the file from the library: its project links, the row (soft), then the stored file
     * — only after the database change has committed.
     */
    public function delete(Media $media): void
    {
        DB::transaction(function () use ($media): void {
            $media->projectFiles()->delete();
            $media->delete();
        });

        Storage::disk($media->disk)->delete($media->path);
    }

    /** Extensions that name the same stored type ("photo.jpeg" is a jpg). */
    private const SAME_EXTENSION = ['jpeg' => 'jpg', 'jpe' => 'jpg'];

    /**
     * The client's filename, made safe to display and to download as: no directory parts, no
     * control characters, at most 255 characters, never empty — and always ending in the
     * extension detected from the content, so a text file named "invoice.exe" is offered as
     * "invoice.txt", never as an executable ("report.PDF" and "photo.jpeg" are left alone).
     */
    public static function displayName(string $clientName, string $extension): string
    {
        $name = basename(str_replace('\\', '/', $clientName));
        $name = trim((string) preg_replace('/[\x00-\x1F\x7F]+/u', '', $name));

        $given = pathinfo($name, PATHINFO_EXTENSION);
        $stem = $given === '' ? $name : Str::beforeLast($name, '.');
        $matches = (self::SAME_EXTENSION[Str::lower($given)] ?? Str::lower($given)) === $extension;
        // The extension survives truncation: the user's own spelling when it matches the content.
        $suffix = '.'.($matches ? $given : $extension);

        $stem = trim($stem, " .\t");
        if ($stem === '') {
            return 'file.'.$extension;
        }

        return Str::limit($stem, 255 - strlen($suffix), '').$suffix;
    }
}
