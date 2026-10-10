<?php

namespace App\Support\Projects;

use App\Enums\ProjectHealth;

/**
 * Every computed figure the project details page shows — the summary cards, Budget Analysis,
 * Project Health — worked out once by ProjectService::figures() so the UI computes nothing.
 * Money is a decimal string ("6221.00"); percentages are whole numbers.
 */
final readonly class ProjectFigures
{
    public function __construct(
        public int $tasksTotal,
        public int $tasksCompleted,
        public int $progress,
        public ProjectHealth $health,
        public int $overdue,
        public int $milestonesTotal,
        public int $milestonesCompleted,
        public int $milestonesPercent,
        public string $budget,
        public string $spent,
        public string $remaining,
        public int $spentPercent,
        public int $remainingPercent,
        public int $contractsActive,
        public int $contractsTotal,
    ) {}

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return [
            'tasks' => ['total' => $this->tasksTotal, 'completed' => $this->tasksCompleted],
            'progress' => $this->progress,
            'health' => ['value' => $this->health->value, 'label' => $this->health->label()],
            'overdue' => $this->overdue,
            'milestones' => ['total' => $this->milestonesTotal, 'completed' => $this->milestonesCompleted, 'percent' => $this->milestonesPercent],
            'budget' => [
                'total' => $this->budget,
                'spent' => $this->spent,
                'remaining' => $this->remaining,
                'spent_percent' => $this->spentPercent,
                'remaining_percent' => $this->remainingPercent,
            ],
            'contracts' => ['active' => $this->contractsActive, 'total' => $this->contractsTotal],
        ];
    }
}
