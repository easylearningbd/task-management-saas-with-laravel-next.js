<?php

namespace App\Models;

use App\Enums\ProjectPriority;
use App\Enums\ProjectStatus;
use App\Models\Concerns\BelongsToCompany;
use Database\Factories\ProjectFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;
use LogicException;

/**
 * A company's project (PRD §6.3). BelongsToCompany limits every query (route binding included)
 * to the current company and stamps `company_id` on create; `company_id` is deliberately not
 * fillable. `client_id` is validated against the company's own clients by the requests.
 *
 * Its tabs: milestones, items, notes, expenses and files (links to media). Tasks and contracts
 * don't exist yet: `tasks()` / `contracts()` are marked stubs that throw, and the figures that
 * depend on them are honest zeros in ProjectService.
 *
 * @property int $id
 * @property int $company_id
 * @property int $client_id
 * @property string $name
 * @property string|null $description
 * @property Carbon $start_date
 * @property Carbon $end_date
 * @property string $budget
 * @property ProjectPriority $priority
 * @property ProjectStatus $status
 */
class Project extends Model
{
    /** @use HasFactory<ProjectFactory> */
    use BelongsToCompany, HasFactory, SoftDeletes;

    protected $fillable = ['client_id', 'name', 'description', 'start_date', 'end_date', 'budget', 'priority', 'status'];

    protected $attributes = [
        'priority' => 'medium',
        'status' => 'active',
        'budget' => '0.00',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'budget' => 'decimal:2',
            'priority' => ProjectPriority::class,
            'status' => ProjectStatus::class,
        ];
    }

    /** The client (kept visible even if it was deleted later; ClientService blocks that). */
    public function client(): BelongsTo
    {
        return $this->belongsTo(Client::class)->withTrashed();
    }

    public function milestones(): HasMany
    {
        return $this->hasMany(Milestone::class);
    }

    public function items(): HasMany
    {
        return $this->hasMany(ProjectItem::class);
    }

    public function notes(): HasMany
    {
        return $this->hasMany(ProjectNote::class);
    }

    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }

    /** The file links (each points at a media file in the company's library). */
    public function files(): HasMany
    {
        return $this->hasMany(ProjectFile::class);
    }

    /** Name, description or the client's name contains the term (LIKE-escaped). */
    public function scopeSearch(Builder $query, ?string $term): void
    {
        $term = trim((string) $term);
        if ($term === '') {
            return;
        }

        $like = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $term).'%';
        $query->where(fn (Builder $q) => $q
            ->whereRaw("projects.name like ? escape '!'", [$like])
            ->orWhereRaw("projects.description like ? escape '!'", [$like])
            ->orWhereHas('client', fn (Builder $c) => $c->whereRaw("clients.name like ? escape '!'", [$like])));
    }

    public function scopeOfStatus(Builder $query, ProjectStatus|string|null $status): void
    {
        if ($status === null || $status === '') {
            return;
        }
        $query->where('projects.status', $status instanceof ProjectStatus ? $status->value : $status);
    }

    public function scopeOfPriority(Builder $query, ProjectPriority|string|null $priority): void
    {
        if ($priority === null || $priority === '') {
            return;
        }
        $query->where('projects.priority', $priority instanceof ProjectPriority ? $priority->value : $priority);
    }

    public function scopeForClient(Builder $query, int|string|null $clientId): void
    {
        if ($clientId === null || $clientId === '') {
            return;
        }
        $query->where('projects.client_id', (int) $clientId);
    }

    /**
     * STUB — the project's tasks (PRD §6.4). The `tasks` table does not exist yet. When it lands,
     * return `$this->hasMany(Task::class)` and replace the honest zeros marked TODO(tasks) in
     * ProjectService. Deliberately throws rather than pretending there are none.
     */
    public function tasks(): never
    {
        throw new LogicException('Projects have no tasks relation yet: the tasks table does not exist.');
    }

    /**
     * STUB — the project's contracts (PRD §6.10). The `contracts` table does not exist yet. When
     * it lands, return `$this->hasMany(Contract::class)` and replace the zeros marked
     * TODO(contracts) in ProjectService.
     */
    public function contracts(): never
    {
        throw new LogicException('Projects have no contracts relation yet: the contracts table does not exist.');
    }
}
