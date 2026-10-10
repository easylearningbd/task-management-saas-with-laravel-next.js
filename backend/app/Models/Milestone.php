<?php

namespace App\Models;

use App\Enums\MilestoneStatus;
use App\Models\Concerns\BelongsToCompany;
use Database\Factories\MilestoneFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * A project milestone (PRD §6.3 Milestones tab). Tenant-owned like its project: created through
 * the company's own (scoped) project, so `company_id` and `project_id` always agree; neither is
 * fillable from input.
 *
 * @property int $id
 * @property int $company_id
 * @property int $project_id
 * @property string $title
 * @property string|null $description
 * @property Carbon|null $start_date
 * @property Carbon|null $due_date
 * @property int $progress
 * @property MilestoneStatus $status
 */
class Milestone extends Model
{
    /** @use HasFactory<MilestoneFactory> */
    use BelongsToCompany, HasFactory, SoftDeletes;

    protected $fillable = ['title', 'description', 'start_date', 'due_date', 'progress', 'status'];

    protected $attributes = [
        'progress' => 0,
        'status' => 'pending',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'due_date' => 'date',
            'progress' => 'integer',
            'status' => MilestoneStatus::class,
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /** Due before today and not completed. */
    public function scopeOverdue(Builder $query, ?Carbon $today = null): void
    {
        $query->whereNotNull('milestones.due_date')
            ->whereDate('milestones.due_date', '<', ($today ?? Carbon::today())->toDateString())
            ->where('milestones.status', '!=', MilestoneStatus::Completed->value);
    }

    /** Order on the Milestones tab and in Milestone Progress: by due date (none last), then created. */
    public function scopeInPlanOrder(Builder $query): void
    {
        $query->orderByRaw('CASE WHEN milestones.due_date IS NULL THEN 1 ELSE 0 END')
            ->orderBy('milestones.due_date')
            ->orderBy('milestones.id');
    }
}
