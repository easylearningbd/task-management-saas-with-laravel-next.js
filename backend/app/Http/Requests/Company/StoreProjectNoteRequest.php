<?php

namespace App\Http\Requests\Company;

use App\Models\Project;
use Illuminate\Foundation\Http\FormRequest;

/**
 * POST /api/v1/projects/{project}/notes — the Add Note modal: Title*, Content*. The author is the
 * signed-in user (ProjectNoteService), never read from the request.
 */
class StoreProjectNoteRequest extends FormRequest
{
    public const TITLE_MAX = 255;

    public const CONTENT_MAX = 20000;

    public function authorize(): bool
    {
        $project = $this->route('project');

        return $project instanceof Project && $this->user()->can('update', $project);
    }

    protected function prepareForValidation(): void
    {
        $trimmed = [];
        foreach (['title', 'content'] as $field) {
            if (is_string($this->input($field))) {
                $trimmed[$field] = trim($this->input($field));
            }
        }

        $this->merge($trimmed);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:'.self::TITLE_MAX],
            'content' => ['required', 'string', 'max:'.self::CONTENT_MAX],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'title.required' => __('The title is required.'),
            'title.max' => __('The title may not be longer than :max characters.'),
            'content.required' => __('The content is required.'),
            'content.max' => __('The content may not be longer than :max characters.'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function noteData(): array
    {
        return $this->safe()->only(['title', 'content']);
    }
}
