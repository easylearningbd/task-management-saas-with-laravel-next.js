<?php

namespace App\Http\Requests\Company;

use App\Enums\ProjectPriority;
use App\Enums\ProjectStatus;
use App\Http\Requests\IndexRequest;
use App\Models\Project;
use Illuminate\Database\Query\Expression;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

/**
 * GET /api/v1/projects — search (name, description, client name), status, priority, client,
 * sort (whitelist below; anything else → 422 from IndexRequest), page, per_page (10, max 100).
 */
class IndexProjectRequest extends IndexRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('viewAny', Project::class);
    }

    /**
     * Enums sort by meaning, not alphabet: priority Low → Urgent, status in the tabs' order.
     *
     * @return array<string, string|Expression>
     */
    public function sortable(): array
    {
        return [
            'name' => 'projects.name',
            'priority' => DB::raw("CASE projects.priority WHEN 'low' THEN 1 WHEN 'medium' THEN 2 WHEN 'high' THEN 3 WHEN 'urgent' THEN 4 END"),
            'status' => DB::raw("CASE projects.status WHEN 'active' THEN 1 WHEN 'completed' THEN 2 WHEN 'on_hold' THEN 3 WHEN 'inactive' THEN 4 END"),
            'budget' => 'projects.budget',
            'start_date' => 'projects.start_date',
            'end_date' => 'projects.end_date',
            'created_at' => 'projects.created_at',
        ];
    }

    /** Oldest first — the Projects screenshot's order. */
    public function defaultSort(): string
    {
        return 'created_at';
    }

    /**
     * @return array<string, array<int, mixed>>
     */
    protected function filterRules(): array
    {
        return [
            'status' => ['nullable', Rule::enum(ProjectStatus::class)],
            'priority' => ['nullable', Rule::enum(ProjectPriority::class)],
            'client_id' => ['nullable', 'integer', 'min:1'],
            // The Filters panel's Created At range (as on Clients and Task Stages).
            'created_from' => ['nullable', 'date_format:Y-m-d'],
            'created_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:created_from'],
        ];
    }

    /**
     * @return array{search: ?string, status: ?string, priority: ?string, client_id: ?int, created_from: ?string, created_to: ?string}
     */
    public function filters(): array
    {
        $client = $this->validated('client_id');

        return [
            'search' => $this->search(),
            'status' => $this->validated('status'),
            'priority' => $this->validated('priority'),
            'client_id' => $client === null ? null : (int) $client,
            'created_from' => $this->validated('created_from'),
            'created_to' => $this->validated('created_to'),
        ];
    }
}
