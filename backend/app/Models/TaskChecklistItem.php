<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Database\Factories\TaskChecklistItemFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One line of a task's checklist. Independent of the task's progress (business rule 9).
 * `position` (contiguous within the task) is written by TaskChecklistService.
 *
 * @property int $id
 * @property int $company_id
 * @property int $task_id
 * @property string $title
 * @property bool $is_completed
 * @property int $position
 */
class TaskChecklistItem extends Model
{
    /** @use HasFactory<TaskChecklistItemFactory> */
    use BelongsToCompany, HasFactory;

    protected $fillable = ['title', 'is_completed'];

    protected $attributes = [
        'is_completed' => false,
    ];

    protected function casts(): array
    {
        return [
            'is_completed' => 'boolean',
            'position' => 'integer',
        ];
    }

    public function task(): BelongsTo
    {
        return $this->belongsTo(Task::class);
    }
}
