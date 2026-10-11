<?php

namespace App\Services;

use App\Models\Media;
use App\Models\Project;
use App\Models\ProjectFile;
use App\Models\User;
use App\Services\Concerns\LinksMedia;
use Illuminate\Database\Eloquent\Collection;

/**
 * The Files tab: links between a project and media in the company's library. The project is
 * route-bound and the media is looked up through the company's scoped query, so both are the
 * company's own. Attaching is idempotent: attaching a file that is already linked returns the
 * existing link (the picker can be clicked twice safely — LinksMedia, shared with task files).
 * Detaching removes the link only.
 */
class ProjectFileService
{
    use LinksMedia;

    /**
     * @return Collection<int, ProjectFile>
     */
    public function forProject(Project $project): Collection
    {
        return $project->files()->with('media')->orderByDesc('project_files.id')->get();
    }

    /**
     * @return array{0: ProjectFile, 1: bool} the link, and whether it was created now
     */
    public function attach(Project $project, Media $media, User $attachedBy): array
    {
        /** @var array{0: ProjectFile, 1: bool} */
        return $this->attachMedia($project->files(), $media, $attachedBy);
    }

    /** Removes the link; the media stays in the library. */
    public function detach(ProjectFile $file): void
    {
        $file->delete();
    }
}
