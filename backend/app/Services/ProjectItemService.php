<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectItem;
use Illuminate\Database\Eloquent\Collection;

/**
 * The Items tab: products and services owned by one project. Always reached through the
 * company's own (route-bound) project; BelongsToCompany stamps the same `company_id`.
 */
class ProjectItemService
{
    /**
     * @return Collection<int, ProjectItem>
     */
    public function forProject(Project $project): Collection
    {
        return $project->items()->orderBy('project_items.id')->get();
    }

    /**
     * @param  array<string, mixed>  $data  validated name, description, default_price, unit, status
     */
    public function create(Project $project, array $data): ProjectItem
    {
        /** @var ProjectItem */
        return $project->items()->create($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(ProjectItem $item, array $data): ProjectItem
    {
        $item->update($data);

        return $item;
    }

    /** Soft delete. */
    public function delete(ProjectItem $item): void
    {
        $item->delete();
    }
}
