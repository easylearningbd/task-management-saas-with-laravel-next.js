<?php

namespace App\Http\Requests\Company;

use App\Models\Media;
use App\Services\MediaService;
use Illuminate\Foundation\Http\FormRequest;

/**
 * POST /api/v1/media — one upload (`file`). Validated by content type (detected from the bytes,
 * against MediaService::ALLOWED) and size (MediaService::MAX_BYTES, 10 MB). The plan's storage
 * allowance is checked by MediaService (a 422 with code `storage_limit_reached`).
 */
class StoreMediaRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('create', Media::class);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'file' => [
                'required',
                'file',
                'mimetypes:'.implode(',', array_keys(MediaService::ALLOWED)),
                'max:'.intdiv(MediaService::MAX_BYTES, 1024),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'file.required' => __('Choose a file to upload.'),
            'file.file' => __('The upload failed. Try again.'),
            'file.uploaded' => __('The file could not be uploaded. It may be larger than the server allows.'),
            'file.mimetypes' => __('Upload an image, PDF, Word, Excel, PowerPoint, text or CSV file.'),
            'file.max' => __('The file may not be larger than :max kilobytes.'),
        ];
    }
}
