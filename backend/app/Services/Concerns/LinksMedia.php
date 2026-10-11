<?php

namespace App\Services\Concerns;

use App\Models\Media;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\UniqueConstraintViolationException;

/**
 * Attaching library media to a record (a project's or a task's Files tab) — one implementation
 * for every "files" link table (`project_files`, `task_files`: company_id, owner id, media_id,
 * attached_by, unique owner + media). Idempotent: attaching a file that is already linked returns
 * the existing link, so the picker can be clicked twice safely, even at the same moment.
 */
trait LinksMedia
{
    /**
     * @param  HasMany<Model, Model>  $links  the owner's links relation, e.g. `$project->files()`
     * @return array{0: Model, 1: bool} the link (media loaded), and whether it was created now
     */
    protected function attachMedia(HasMany $links, Media $media, User $attachedBy): array
    {
        $existing = (clone $links)->where('media_id', $media->getKey())->first();
        if ($existing) {
            return [$existing->load('media'), false];
        }

        try {
            $link = $links->make();
            $link->forceFill(['media_id' => $media->getKey(), 'attached_by' => $attachedBy->getKey()])->save();

            return [$link->load('media'), true];
        } catch (UniqueConstraintViolationException) {
            // Two clicks at once: the other request linked it first.
            return [(clone $links)->where('media_id', $media->getKey())->firstOrFail()->load('media'), false];
        }
    }
}
