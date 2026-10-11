<?php

namespace App\Services;

use App\Models\Milestone;
use App\Models\Project;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Facades\DB;

/**
 * Milestone business logic (PRD §6.3 Milestones tab). A milestone is always created through
 * the company's own project (route-bound, so already tenant-scoped); BelongsToCompany stamps
 * the same `company_id`. Progress and status are independent — the form sets both.
 */
class MilestoneService
{
    public function __construct(private readonly TaskService $tasks) {}

    /**
     * @return Collection<int, Milestone>
     */
    public function forProject(Project $project): Collection
    {
        return $project->milestones()->inPlanOrder()->get();
    }

    /**
     * @param  array<string, mixed>  $data  validated title, description, start_date, due_date, progress, status
     */
    public function create(Project $project, array $data): Milestone
    {
        /** @var Milestone */
        return $project->milestones()->create($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Milestone $milestone, array $data): Milestone
    {
        $milestone->update($data);

        return $milestone;
    }

    /** Soft delete. */
    /** Soft delete; its tasks stay, no longer linked to it (a soft delete fires no FK cascade). */
    public function delete(Milestone $milestone): void
    {
        DB::transaction(function () use ($milestone): void {
            $this->tasks->detachMilestone($milestone);
            $milestone->delete();
        });
    }
}
