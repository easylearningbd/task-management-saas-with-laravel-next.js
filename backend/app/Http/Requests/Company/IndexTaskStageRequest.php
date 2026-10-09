<?php

namespace App\Http\Requests\Company;

use App\Enums\TaskStageStatus;
use App\Models\TaskStage;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * GET /api/v1/task-stages — the whole workflow, always in stage order: search (name,
 * description), status, created date range. Deliberately not paginated and not sortable:
 * stages are few, the order IS the sort, and drag-to-reorder needs every stage on screen.
 */
class IndexTaskStageRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('viewAny', TaskStage::class);
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    public function rules(): array
    {
        return [
            'search' => ['nullable', 'string', 'max:100'],
            'status' => ['nullable', Rule::enum(TaskStageStatus::class)],
            'created_from' => ['nullable', 'date_format:Y-m-d'],
            'created_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:created_from'],
        ];
    }

    /**
     * @return array{search: ?string, status: ?string, created_from: ?string, created_to: ?string}
     */
    public function filters(): array
    {
        $search = trim((string) $this->validated('search'));

        return [
            'search' => $search === '' ? null : $search,
            'status' => $this->validated('status'),
            'created_from' => $this->validated('created_from'),
            'created_to' => $this->validated('created_to'),
        ];
    }
}
