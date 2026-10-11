<?php

namespace App\Services;

use App\Models\Media;
use App\Models\Task;
use App\Models\TaskFile;
use App\Models\User;
use App\Services\Concerns\LinksMedia;
use Illuminate\Database\Eloquent\Collection;

/**
 * The task Files tab — mirrors ProjectFileService: links between a task and media in the
 * company's library (uploads, the storage limit and deletion stay MediaService's). Attaching is
 * idempotent (LinksMedia); detaching removes the link only, the media stays.
 */
class TaskFileService
{
    use LinksMedia;

    /**
     * @return Collection<int, TaskFile>
     */
    public function forTask(Task $task): Collection
    {
        return $task->files()->with('media')->orderByDesc('task_files.id')->get();
    }

    /**
     * @return array{0: TaskFile, 1: bool} the link, and whether it was created now
     */
    public function attach(Task $task, Media $media, User $attachedBy): array
    {
        /** @var array{0: TaskFile, 1: bool} */
        return $this->attachMedia($task->files(), $media, $attachedBy);
    }

    /** Removes the link; the media stays in the library. */
    public function detach(TaskFile $file): void
    {
        $file->delete();
    }
}
