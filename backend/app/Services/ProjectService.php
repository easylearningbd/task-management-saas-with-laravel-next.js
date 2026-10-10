<?php

namespace App\Services;

use App\Enums\MilestoneStatus;
use App\Enums\ProjectHealth;
use App\Enums\ProjectStatus;
use App\Models\Milestone;
use App\Models\Project;
use App\Support\Projects\ProjectFigures;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Project business logic (PRD §6.3). Every method works on the current company's projects only
 * (BelongsToCompany); nothing here takes or sets a `company_id`.
 *
 * Honest figures: tasks and contracts don't exist yet, so everything derived from them is 0
 * here, in one place each, marked TODO(tasks) / TODO(contracts). Nothing is estimated.
 * Money math is bcmath on decimal strings, never floats.
 */
class ProjectService
{
    public const ERROR_KEY = 'project';

    public function __construct(
        private readonly ExpenseService $expenses,
        private readonly PlanLimitService $limits,
    ) {}

    /**
     * The list query: search (name, description, client), status, priority, client.
     *
     * @param  array{search?: ?string, status?: ?string, priority?: ?string, client_id?: int|string|null, created_from?: ?string, created_to?: ?string}  $filters
     * @return Builder<Project>
     */
    public function query(array $filters): Builder
    {
        return Project::query()
            ->with('client')
            ->search($filters['search'] ?? null)
            ->ofStatus($filters['status'] ?? null)
            ->ofPriority($filters['priority'] ?? null)
            ->forClient($filters['client_id'] ?? null)
            ->when($filters['created_from'] ?? null, fn (Builder $q, string $from) => $q->whereDate('projects.created_at', '>=', $from))
            ->when($filters['created_to'] ?? null, fn (Builder $q, string $to) => $q->whereDate('projects.created_at', '<=', $to));
    }

    /**
     * Sets `progress` (0–100) on each listed project.
     *
     * @param  iterable<Project>  $projects
     */
    public function withProgress(iterable $projects): void
    {
        foreach ($projects as $project) {
            $project->setAttribute('progress', $this->progress($project));
        }
    }

    /**
     * Counts per status — the stat cards and the status tabs.
     *
     * @return array{total: int, active: int, completed: int, on_hold: int, inactive: int}
     */
    public function stats(): array
    {
        $counts = Project::query()
            ->selectRaw('CAST(projects.status AS CHAR) as status_value, COUNT(*) as aggregate')
            ->groupBy('projects.status')
            ->pluck('aggregate', 'status_value');

        $stats = ['total' => (int) $counts->sum()];
        foreach (ProjectStatus::cases() as $status) {
            $stats[$status->value] = (int) ($counts[$status->value] ?? 0);
        }

        /** @var array{total: int, active: int, completed: int, on_hold: int, inactive: int} */
        return $stats;
    }

    /**
     * @param  array<string, mixed>  $data  validated name, description, client_id, start_date, end_date, budget, priority, status
     */
    public function create(array $data): Project
    {
        return DB::transaction(function () use ($data): Project {
            // The plan's max_projects (-1 = unlimited) — checked under the company lock, so two
            // creates can't both take the last slot. Throws PlanLimitReached (a 422).
            $this->limits->ensureCanCreateProject();

            return Project::create($data)->load('client');
        });
    }

    /**
     * Editing is never blocked by the plan limit.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(Project $project, array $data): Project
    {
        $project->update($data);

        return $project->load('client');
    }

    /**
     * The lock icon: Active ⇄ Inactive only. Completed and On Hold are set deliberately in the
     * edit form, so the toggle refuses them instead of overwriting them.
     */
    public function toggleStatus(Project $project): Project
    {
        $next = $project->status->toggled();
        if ($next === null) {
            throw ValidationException::withMessages([
                self::ERROR_KEY => __('Only active and inactive projects can be switched here. Edit the project to change it from :status.', [
                    'status' => strtolower($project->status->label()),
                ]),
            ]);
        }

        $project->status = $next;
        $project->save();

        return $project->load('client');
    }

    /**
     * Soft-deletes the project and its children in one transaction. A soft delete never fires
     * the foreign keys' ON DELETE CASCADE, so the children are handled here (Phase 0 decision 4):
     * milestones, items, notes and expenses are soft-deleted with it; the file links are removed
     * (the media themselves stay in the library).
     */
    public function delete(Project $project): void
    {
        DB::transaction(function () use ($project): void {
            $project->milestones()->delete();
            $project->items()->delete();
            $project->notes()->delete();
            $project->expenses()->delete();
            $project->files()->delete();
            $project->delete();
        });
    }

    /** Everything the details page shows, computed once. */
    public function figures(Project $project): ProjectFigures
    {
        // TODO(tasks): the tasks table doesn't exist yet — no tasks, none completed.
        $tasksTotal = 0;
        $tasksCompleted = 0;
        $progress = $this->progress($project);

        $milestones = Milestone::query()
            ->where('milestones.project_id', $project->getKey())
            ->selectRaw('COUNT(*) as total')
            ->selectRaw('SUM(CASE WHEN milestones.status = ? THEN 1 ELSE 0 END) as completed', [MilestoneStatus::Completed->value])
            ->first();
        $milestonesTotal = (int) $milestones?->getAttribute('total');
        $milestonesCompleted = (int) $milestones?->getAttribute('completed');

        // Overdue: milestones past their due date and not completed.
        // TODO(tasks): add overdue tasks once they exist.
        $overdue = Milestone::query()->where('milestones.project_id', $project->getKey())->overdue()->count();

        $budget = (string) $project->budget;
        $spent = $this->spent($project);
        $remaining = bcsub($budget, $spent, 2);

        // TODO(contracts): the contracts table doesn't exist yet — no contracts.
        $contractsActive = 0;
        $contractsTotal = 0;

        return new ProjectFigures(
            tasksTotal: $tasksTotal,
            tasksCompleted: $tasksCompleted,
            progress: $progress,
            health: ProjectHealth::fromProgress($progress),
            overdue: $overdue,
            milestonesTotal: $milestonesTotal,
            milestonesCompleted: $milestonesCompleted,
            milestonesPercent: $this->percent((string) $milestonesCompleted, (string) $milestonesTotal),
            budget: $budget,
            spent: $spent,
            remaining: $remaining,
            spentPercent: $this->percent($spent, $budget),
            remainingPercent: max(0, 100 - $this->percent($spent, $budget)),
            contractsActive: $contractsActive,
            contractsTotal: $contractsTotal,
        );
    }

    /** Overall progress: tasks in a done stage ÷ all tasks (PRD §6.3). */
    private function progress(Project $project): int
    {
        // TODO(tasks): tasks in a done stage ÷ the project's tasks. No tasks yet → 0%.
        return 0;
    }

    /** The project's spending so far: the exact sum of its expenses. */
    private function spent(Project $project): string
    {
        return $this->expenses->totalFor($project);
    }

    /** `$part` of `$whole` as a whole percentage (half up); 0 when there is no whole. */
    private function percent(string $part, string $whole): int
    {
        if (bccomp($whole, '0', 2) <= 0) {
            return 0;
        }

        // bcmath for the division (exact to 4 places); the final rounding of a ratio is safe.
        return (int) round((float) bcdiv(bcmul($part, '100', 4), $whole, 4));
    }
}
