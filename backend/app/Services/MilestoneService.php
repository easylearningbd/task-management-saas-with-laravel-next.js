<?php

namespace App\Services;

use App\Models\Milestone;
use App\Models\Project;
use Illuminate\Database\Eloquent\Collection;

/**
 * Milestone business logic (PRD §6.3 Milestones tab). A milestone is always created through
 * the company's own project (route-bound, so already tenant-scoped); BelongsToCompany stamps
 * the same `company_id`. Progress and status are independent — the form sets both.
 */
class MilestoneService
{
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
    public function delete(Milestone $milestone): void
    {
        $milestone->delete();
    }
}
