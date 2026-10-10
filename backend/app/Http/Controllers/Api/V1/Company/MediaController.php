<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Http\Controllers\Controller;
use App\Http\Requests\Company\IndexMediaRequest;
use App\Http\Requests\Company\StoreMediaRequest;
use App\Http\Resources\MediaResource;
use App\Models\Media;
use App\Services\MediaService;
use App\Support\ListQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * The company's media library: list (search + pagination), upload (type, size and the plan's
 * storage allowance checked), delete, and the only way a stored file is ever read —
 * GET …/media/{media}/file, authenticated and tenant-scoped (another company's id → 404).
 */
class MediaController extends Controller
{
    /** Types a browser may show in place; everything else is always a download. */
    private const INLINE = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

    public function __construct(private readonly MediaService $media) {}

    public function index(IndexMediaRequest $request): AnonymousResourceCollection
    {
        return MediaResource::collection(ListQuery::paginate($this->media->query($request->filters()), $request));
    }

    /** 201 — or 422 `storage_limit_reached` when the plan's storage allowance would be exceeded. */
    public function store(StoreMediaRequest $request): JsonResponse
    {
        return (new MediaResource($this->media->store($request->file('file'), $request->user())))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /** Removes the file from the library: its project links, the row, the stored file. */
    public function destroy(Media $media): Response
    {
        Gate::authorize('delete', $media);
        $this->media->delete($media);

        return response()->noContent();
    }

    /**
     * The file itself — inline for images and PDFs (thumbnails, preview), else a download.
     * Never cached by the browser (`no-store`): the URL is the same for every visitor, so a
     * cached copy would be shown to whoever signs in next on that browser, without this check.
     */
    public function file(Request $request, Media $media): StreamedResponse
    {
        Gate::authorize('view', $media);

        $disk = Storage::disk($media->disk);
        abort_unless($disk->exists($media->path), Response::HTTP_NOT_FOUND);

        $inline = ! $request->boolean('download') && in_array($media->mime_type, self::INLINE, true);

        return $disk->response($media->path, $media->original_name, [
            'Content-Type' => $media->mime_type,
            'X-Content-Type-Options' => 'nosniff',
            'Cache-Control' => 'private, no-store',
        ], $inline ? 'inline' : 'attachment');
    }
}
