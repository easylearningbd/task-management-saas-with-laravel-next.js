<?php

namespace App\Models;

use App\Enums\TaskPriority;
use App\Models\Concerns\BelongsToCompany;
use Database\Factories\TaskFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * A task — a card on the Kanban board (PRD §6.4). BelongsToCompany scopes every query and stamps
 * `company_id`. Only the form fields are fillable; `task_stage_id`, `position`, `completed_at` and
 * `created_by` are written by TaskService (stage moves keep positions contiguous and apply the
 * done-stage rules), never mass-assigned from input.
 *
 * @property int $id
 * @property int $company_id
 * @property int $project_id
 * @property int|null $milestone_id
 * @property int $task_stage_id
 * @property string $title
 * @property string|null $description
 * @property Carbon $start_date
 * @property Carbon $due_date
 * @property TaskPriority $priority
 * @property int $progress
 * @property int $position
 * @property Carbon|null $completed_at
 * @property int|null $created_by
 */
class Task extends Model
{
    /** @use HasFactory<TaskFactory> */
    use BelongsToCompany, HasFactory, SoftDeletes;

    protected $fillable = ['project_id', 'milestone_id', 'title', 'description', 'start_date', 'due_date', 'priority', 'progress'];

    protected $attributes = [
        'priority' => 'medium',
        'progress' => 0,
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'due_date' => 'date',
            'priority' => TaskPriority::class,
            'progress' => 'integer',
            'position' => 'integer',
            'completed_at' => 'datetime',
        ];
    }

    /** The project — kept even if it is soft-deleted later (history reads it). */
    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class)->withTrashed();
    }

    public function milestone(): BelongsTo
    {
        return $this->belongsTo(Milestone::class)->withTrashed();
    }

    public function stage(): BelongsTo
    {
        return $this->belongsTo(TaskStage::class, 'task_stage_id')->withTrashed();
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by')->withTrashed();
    }

    public function checklistItems(): HasMany
    {
        return $this->hasMany(TaskChecklistItem::class)->orderBy('task_checklist_items.position');
    }

    public function files(): HasMany
    {
        return $this->hasMany(TaskFile::class);
    }

    /** Board order: column position, then id (a stable tie-breaker). */
    public function scopeInColumnOrder(Builder $query): void
    {
        $query->orderBy('tasks.position')->orderBy('tasks.id');
    }

    /**
     * Overdue (business rule 5): due before today AND not in a done stage. No stage is
     * special-cased by name — a Cancelled task past its due date is overdue too.
     */
    public function scopeOverdue(Builder $query, ?Carbon $today = null): void
    {
        $query->whereDate('tasks.due_date', '<', ($today ?? Carbon::today())->toDateString())
            ->whereHas('stage', fn (Builder $stage) => $stage->where('task_stages.is_done_stage', false));
    }

    /** In a done stage. */
    public function scopeDone(Builder $query): void
    {
        $query->whereHas('stage', fn (Builder $stage) => $stage->where('task_stages.is_done_stage', true));
    }
}
