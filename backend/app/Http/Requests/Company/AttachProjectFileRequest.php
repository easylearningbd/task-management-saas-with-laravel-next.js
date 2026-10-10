<?php

namespace App\Http\Requests\Company;

use App\Models\Project;
use App\Support\Tenancy\Tenancy;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * POST /api/v1/projects/{project}/files — attach a file from the company's media library
 * (`media_id`). Another company's media id is simply unknown here (422).
 */
class AttachProjectFileRequest extends FormRequest
{
    public function authorize(): bool
    {
        $project = $this->route('project');

        return $project instanceof Project && $this->user()->can('update', $project);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'media_id' => [
                'required',
                'integer',
                Rule::exists('media', 'id')
                    ->where('company_id', Tenancy::instance()->requireCompanyId())
                    ->whereNull('deleted_at'),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'media_id.required' => __('Choose a file.'),
            'media_id.integer' => __('Choose a file.'),
            'media_id.exists' => __('That file isn\'t in your media library.'),
        ];
    }

    public function mediaId(): int
    {
        return (int) $this->validated('media_id');
    }
}
