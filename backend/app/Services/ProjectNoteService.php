<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectNote;
use App\Models\User;
use Illuminate\Database\Eloquent\Collection;

/**
 * The Notes tab. The author (`created_by`) is the signed-in user — set here, never from input.
 * Always reached through the company's own (route-bound) project.
 */
class ProjectNoteService
{
    /**
     * Newest first, with each author's name.
     *
     * @return Collection<int, ProjectNote>
     */
    public function forProject(Project $project): Collection
    {
        return $project->notes()->with('author')->orderByDesc('project_notes.id')->get();
    }

    /**
     * @param  array<string, mixed>  $data  validated title, content
     */
    public function create(Project $project, array $data, User $author): ProjectNote
    {
        /** @var ProjectNote $note */
        $note = $project->notes()->make($data);
        $note->forceFill(['created_by' => $author->getKey()])->save();

        return $note->load('author');
    }

    /**
     * Editing keeps the original author.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(ProjectNote $note, array $data): ProjectNote
    {
        $note->update($data);

        return $note->load('author');
    }

    /** Soft delete. */
    public function delete(ProjectNote $note): void
    {
        $note->delete();
    }
}
