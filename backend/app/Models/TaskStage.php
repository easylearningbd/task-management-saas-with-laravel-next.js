<?php

namespace App\Models;

use App\Enums\TaskStageStatus;
use App\Models\Concerns\BelongsToCompany;
use Database\Factories\TaskStageFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;
use LogicException;

/**
 * A company's task stage — a column of its workflow (PRD §6.13). BelongsToCompany limits every
 * query (route binding included) to the current company and stamps `company_id` on create;
 * `company_id` is deliberately not fillable. The colour is always stored uppercase.
 *
 * `order` and `is_done_stage` are fillable for the factory and seeders only: requests never
 * write them directly — TaskStageService places stages and moves the done flag, keeping the
 * order contiguous (1..n) and exactly one done stage per company.
 *
 * `order` is an SQL keyword: always reach it through the query builder (which quotes it), never
 * in a raw expression.
 *
 * @property int $id
 * @property int $company_id
 * @property string $name
 * @property string|null $description
 * @property string $color
 * @property int $order
 * @property bool $is_done_stage
 * @property TaskStageStatus $status
 */
class TaskStage extends Model
{
    /** @use HasFactory<TaskStageFactory> */
    use BelongsToCompany, HasFactory, SoftDeletes;

    protected $fillable = ['name', 'description', 'color', 'order', 'is_done_stage', 'status'];

    protected $attributes = [
        'status' => 'active',
        'is_done_stage' => false,
    ];

    protected function casts(): array
    {
        return [
            'order' => 'integer',
            'is_done_stage' => 'boolean',
            'status' => TaskStageStatus::class,
        ];
    }

    /** `#RRGGBB`, uppercase on the way in, whatever case it was given in. */
    protected function color(): Attribute
    {
        return Attribute::set(fn (?string $value): ?string => $value === null ? null : Str::upper(trim($value)));
    }

    public function scopeActive(Builder $query): void
    {
        $query->where('task_stages.status', TaskStageStatus::Active->value);
    }

    /** Workflow order (the id breaks a tie, which a contiguous order never has). */
    public function scopeOrdered(Builder $query): void
    {
        $query->orderBy('task_stages.order')->orderBy('task_stages.id');
    }

    /** Name or description contains the term (LIKE-escaped). */
    public function scopeSearch(Builder $query, ?string $term): void
    {
        $term = trim((string) $term);
        if ($term === '') {
            return;
        }

        $like = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $term).'%';
        $query->where(fn (Builder $q) => $q
            ->whereRaw("task_stages.name like ? escape '!'", [$like])
            ->orWhereRaw("task_stages.description like ? escape '!'", [$like]));
    }

    public function scopeOfStatus(Builder $query, TaskStageStatus|string|null $status): void
    {
        if ($status === null || $status === '') {
            return;
        }

        $query->where('task_stages.status', $status instanceof TaskStageStatus ? $status->value : $status);
    }

    /**
     * Exactly this name, ignoring case ("to do" = "To Do"). Explicit LOWER() so the answer is the
     * same on MySQL (case-insensitive collation) and SQLite (case-sensitive), the test database.
     */
    public function scopeNamed(Builder $query, string $name): void
    {
        $query->whereRaw('LOWER(task_stages.name) = ?', [Str::lower(trim($name))]);
    }

    /**
     * STUB — the tasks in this stage (PRD §6.4 Kanban). The `tasks` table does not exist yet, so
     * there is no relation to return. When the Tasks module lands, replace the body with
     * `return $this->hasMany(Task::class, 'stage_id');` (and a HasMany return type), switch
     * TaskStageService::withTaskCounts() to `->withCount('tasks')`, and wire the delete guard in
     * TaskStageService::ensureDeletable(). Deliberately throws rather than pretending there are
     * none.
     */
    public function tasks(): never
    {
        throw new LogicException('Task stages have no tasks relation yet: the tasks table does not exist.');
    }
}
