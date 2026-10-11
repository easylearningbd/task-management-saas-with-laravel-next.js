<?php

namespace Database\Seeders;

use App\Enums\MilestoneStatus;
use App\Models\Milestone;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskChecklistItem;
use App\Models\TaskStage;
use App\Models\User;
use App\Services\TaskService;
use App\Support\Tenancy\Tenancy;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Demo tasks (PRD §6.4) — idempotent and additive: a task is matched on (company, project, title),
 * deleted rows included (a soft-deleted demo task is left alone, never duplicated); nothing is
 * deleted or truncated. New tasks go through TaskService, so positions, the done-stage rules and
 * `created_by` are the app's own; dates are relative to today. Every write runs inside
 * Tenancy::runAs().
 *
 *  - company@example.com: 52 tasks over the 12 demo projects — To Do 10, In Progress 8, Done 27,
 *    Cancelled 7 — with every priority, a spread of overdue ones (past due, not done), milestones
 *    on about half, and checklists on three. First, the milestones the cards name (Phase 0
 *    decision 4) are added to five more projects (matched on project + title).
 *  - admin@healthcare.com: 4 tasks on its own two projects (one in its custom "Under Review"
 *    stage), so tenant isolation is visible by hand.
 *
 * Needs ProjectSeeder (and the stages from CompanySetupService / TaskStageSeeder) first.
 * Run: php artisan db:seed --class=TaskSeeder
 */
class TaskSeeder extends Seeder
{
    /** @var array<string, list<array{0: string, 1: int}>> project → [milestone title, due (days from today)] */
    private const MILESTONES = [
        'E-commerce Website' => [['Project Setup', -60], ['Admin Panel', 20]],
        'Mobile Banking App' => [['Security Foundation', -30], ['Advanced Features', 30]],
        'Workflow Automation Platform' => [['Phase 1: Development', -150], ['Phase 1: Launch', -60]],
        'Data Lake and Analytics Infrastructure' => [['Phase 1: Development', -20], ['Phase 1: Launch', 40]],
        'Supply Chain Management System' => [['Phase 1: Development', 10]],
        'AI-Powered Analytics Platform' => [['Deployment', 30]],
        'Customer Experience Optimization' => [['Phase 1: Launch', -120]],
        'Cybersecurity Enhancement Program' => [['Phase 1: Launch', -200]],
    ];

    private const P = [
        'EDT' => 'Enterprise Digital Transformation', 'AIA' => 'AI-Powered Analytics Platform',
        'CXO' => 'Customer Experience Optimization', 'SCM' => 'Supply Chain Management System',
        'MFA' => 'Mobile-First Application Suite', 'CYB' => 'Cybersecurity Enhancement Program',
        'DLA' => 'Data Lake and Analytics Infrastructure', 'WAP' => 'Workflow Automation Platform',
        'ECW' => 'E-commerce Website', 'MBA' => 'Mobile Banking App',
        'HPR' => 'Healthcare Portal Redesign', 'ITS' => 'Inventory Tracking System',
    ];

    /**
     * [title, project, stage, priority, milestone|null, start (days from today), due (days), progress]
     * Order within a stage = creation order = column position.
     *
     * @var list<array{0: string, 1: string, 2: string, 3: string, 4: ?string, 5: int, 6: int, 7: int}>
     */
    private const DEMO_TASKS = [
        // To Do (10)
        ['Documentation', 'EDT', 'To Do', 'high', 'Planning', -200, -84, 50],
        ['UI/UX Implementation', 'AIA', 'To Do', 'medium', 'Deployment', -184, -73, 50],
        ['User Acceptance Testing', 'CXO', 'To Do', 'medium', 'Phase 1: Launch', -199, -62, 25],
        ['API Integration', 'SCM', 'To Do', 'high', 'Phase 1: Development', -187, -30, 33],
        ['Third-party Integration', 'CYB', 'To Do', 'urgent', 'Phase 1: Launch', -201, -88, 0],
        ['Barcode Scanner', 'ITS', 'To Do', 'low', null, -20, 25, 0],
        ['Onboarding Flow', 'MFA', 'To Do', 'medium', null, -5, 40, 0],
        ['Data Migration Plan', 'DLA', 'To Do', 'high', 'Phase 1: Development', -10, 20, 10],
        ['Security Audit', 'CYB', 'To Do', 'urgent', null, -3, 14, 0],
        ['Patient Portal Wireframes', 'HPR', 'To Do', 'medium', null, -30, -5, 20],
        // In Progress (8)
        ['Product Catalog Module', 'ECW', 'In Progress', 'medium', 'Project Setup', -201, -74, 29],
        ['Shopping Cart Feature', 'ECW', 'In Progress', 'high', 'Admin Panel', -198, -68, 0],
        ['Payment Integration', 'ECW', 'In Progress', 'urgent', 'Project Setup', -195, -63, 50],
        ['Account Management', 'MBA', 'In Progress', 'high', 'Advanced Features', -204, -79, 67],
        ['Money Transfer', 'MBA', 'In Progress', 'high', 'Security Foundation', -201, -74, 67],
        ['Bill Payment System', 'MBA', 'In Progress', 'urgent', null, -15, 30, 40],
        ['Model Training Pipeline', 'AIA', 'In Progress', 'urgent', 'Deployment', -30, 10, 55],
        ['Inventory Sync Service', 'SCM', 'In Progress', 'medium', null, -25, 15, 30],
        // Done (27)
        ['Code Review', 'WAP', 'Done', 'urgent', 'Phase 1: Launch', -209, -61, 100],
        ['Documentation', 'DLA', 'Done', 'urgent', 'Phase 1: Development', -194, -50, 100],
        ['API Integration', 'DLA', 'Done', 'urgent', 'Phase 1: Development', -192, -77, 100],
        ['System Design', 'EDT', 'Done', 'medium', 'Planning', -189, -81, 100],
        ['Reporting System', 'AIA', 'Done', 'urgent', 'Deployment', -210, -87, 100],
        ['Requirements Gathering', 'EDT', 'Done', 'high', 'Planning', -205, -180, 100],
        ['Architecture Blueprint', 'EDT', 'Done', 'high', 'Development', -170, -140, 100],
        ['Cloud Infrastructure Setup', 'EDT', 'Done', 'medium', 'Deployment', -130, -100, 100],
        ['Stakeholder Workshops', 'CXO', 'Done', 'medium', 'Phase 1: Launch', -230, -200, 100],
        ['Customer Journey Mapping', 'CXO', 'Done', 'high', null, -200, -170, 100],
        ['Survey Analysis', 'CXO', 'Done', 'low', null, -180, -160, 100],
        ['Supplier Portal', 'SCM', 'Done', 'high', 'Phase 1: Development', -40, -10, 100],
        ['Design System', 'MFA', 'Done', 'medium', null, -30, -12, 100],
        ['App Store Setup', 'MFA', 'Done', 'low', null, -25, -20, 100],
        ['Threat Modeling', 'CYB', 'Done', 'urgent', 'Phase 1: Launch', -290, -260, 100],
        ['Firewall Hardening', 'CYB', 'Done', 'high', null, -250, -220, 100],
        ['Staff Security Training', 'CYB', 'Done', 'medium', null, -230, -200, 100],
        ['Data Ingestion Pipelines', 'DLA', 'Done', 'high', 'Phase 1: Launch', -18, -4, 100],
        ['Process Discovery', 'WAP', 'Done', 'high', 'Phase 1: Development', -200, -180, 100],
        ['Approval Workflow Engine', 'WAP', 'Done', 'urgent', 'Phase 1: Development', -175, -140, 100],
        ['Rollout Training', 'WAP', 'Done', 'medium', 'Phase 1: Launch', -110, -80, 100],
        ['Homepage Design', 'ECW', 'Done', 'high', 'Project Setup', -15, -8, 100],
        ['Checkout Flow', 'ECW', 'Done', 'urgent', 'Admin Panel', -12, -2, 100],
        ['Login and 2FA', 'MBA', 'Done', 'urgent', 'Security Foundation', -10, -3, 100],
        ['Card Controls', 'MBA', 'Done', 'high', 'Advanced Features', -9, -1, 100],
        ['Barcode Label Printing', 'ITS', 'Done', 'medium', null, -175, -150, 100],
        ['Stock Count Reports', 'ITS', 'Done', 'high', null, -160, -130, 100],
        // Cancelled (7)
        ['Code Review', 'DLA', 'Cancelled', 'urgent', 'Phase 1: Launch', -205, -42, 50],
        ['API Integration', 'WAP', 'Cancelled', 'medium', 'Phase 1: Launch', -194, -83, 33],
        ['UI/UX Implementation', 'DLA', 'Cancelled', 'high', 'Phase 1: Development', -196, -74, 33],
        ['Voice Assistant Prototype', 'MFA', 'Cancelled', 'low', null, -60, -30, 10],
        ['Legacy Report Export', 'AIA', 'Cancelled', 'medium', null, -90, -60, 20],
        ['Paper Forms Digitisation', 'HPR', 'Cancelled', 'medium', null, -80, -50, 15],
        ['Kiosk Mode', 'ITS', 'Cancelled', 'high', null, -170, -140, 0],
    ];

    /** @var array<string, list<array{0: string, 1: bool}>> "project|task" → [item, done] */
    private const CHECKLISTS = [
        'EDT|Documentation' => [['Outline the user guide', true], ['Write the API reference', false], ['Review with the team', false]],
        'WAP|Code Review' => [['Review the approval engine', true], ['Sign off the pull requests', true]],
        'ECW|Payment Integration' => [['Choose the payment provider', true], ['Sandbox checkout', true], ['Webhooks for refunds', false], ['Go-live checklist', false]],
    ];

    /** @var list<array{0: string, 1: string, 2: string, 3: string, 4: int, 5: int, 6: int}> [title, project, stage, priority, start, due, progress] */
    private const HEALTHCARE_TASKS = [
        ['Map Legacy Records', 'Patient Records Migration', 'To Do', 'high', -10, 15, 0],
        ['Data Validation Scripts', 'Patient Records Migration', 'Under Review', 'urgent', -20, -2, 80],
        ['Branch Sync Job', 'Pharmacy Inventory Sync', 'In Progress', 'medium', -30, 10, 40],
        ['Staff Training', 'Patient Records Migration', 'Done', 'low', -25, -5, 100],
    ];

    public function run(TaskService $tasks): void
    {
        $today = Carbon::today();

        $this->forCompany('company@example.com', function (User $company) use ($tasks, $today): string {
            $milestones = $this->seedMilestones($today);
            $created = 0;
            foreach (self::DEMO_TASKS as [$title, $key, $stage, $priority, $milestone, $start, $due, $progress]) {
                $created += $this->seedTask($tasks, $company, $today, self::P[$key], $title, $stage, $priority, $milestone, $start, $due, $progress);
            }
            $items = $this->seedChecklists();

            return sprintf('%d milestones (%d new) · %d tasks (%d new) · %d checklist items (%d new)', $milestones[0], $milestones[1], count(self::DEMO_TASKS), $created, $items[0], $items[1]);
        });

        $this->forCompany('admin@healthcare.com', function (User $company) use ($tasks, $today): string {
            $created = 0;
            foreach (self::HEALTHCARE_TASKS as [$title, $project, $stage, $priority, $start, $due, $progress]) {
                $created += $this->seedTask($tasks, $company, $today, $project, $title, $stage, $priority, null, $start, $due, $progress);
            }

            return sprintf('%d tasks (%d new)', count(self::HEALTHCARE_TASKS), $created);
        });
    }

    /** @param  callable(User): string  $seed */
    private function forCompany(string $email, callable $seed): void
    {
        $company = User::query()->where('email', $email)->first();
        if (! $company || ! $company->isCompany()) {
            $this->command?->warn(sprintf('  %-26s skipped — no such company', $email));

            return;
        }

        $line = Tenancy::instance()->runAs($company, fn () => DB::transaction(fn () => $seed($company)));
        $this->command?->info(sprintf('  %-26s %s', $email, $line));
    }

    /** @return array{0: int, 1: int} [total, new] */
    private function seedMilestones(Carbon $today): array
    {
        $total = 0;
        $new = 0;
        foreach (self::MILESTONES as $projectName => $rows) {
            $project = Project::query()->where('name', $projectName)->first();
            if (! $project) {
                continue;
            }
            foreach ($rows as [$title, $due]) {
                $total++;
                $milestone = $project->milestones()->withTrashed()->firstOrNew(['title' => $title]);
                if ($milestone->exists) {
                    continue;
                }
                $milestone->fill([
                    'description' => null,
                    'due_date' => $today->copy()->addDays($due),
                    'progress' => $due < 0 ? 100 : 40,
                    'status' => $due < 0 ? MilestoneStatus::Completed : MilestoneStatus::InProgress,
                ])->save();
                $new++;
            }
        }

        return [$total, $new];
    }

    /** @return int 1 when created now */
    private function seedTask(TaskService $tasks, User $company, Carbon $today, string $projectName, string $title, string $stageName, string $priority, ?string $milestoneTitle, int $start, int $due, int $progress): int
    {
        $project = Project::query()->where('name', $projectName)->first();
        $stage = TaskStage::query()->named($stageName)->first();
        if (! $project || ! $stage) {
            $this->command?->warn(sprintf('    "%s" skipped — no project "%s" or stage "%s"', $title, $projectName, $stageName));

            return 0;
        }
        if (Task::withTrashed()->where('project_id', $project->getKey())->where('title', $title)->exists()) {
            return 0;
        }

        $milestoneId = $milestoneTitle === null ? null : Milestone::query()->where('project_id', $project->getKey())->where('title', $milestoneTitle)->value('id');
        $startDate = $today->copy()->addDays($start);
        $dueDate = $today->copy()->addDays($due);

        $task = $tasks->create([
            'project_id' => $project->getKey(),
            'milestone_id' => $milestoneId,
            'task_stage_id' => $stage->getKey(),
            'title' => $title,
            'description' => sprintf('%s for %s.', $title, $projectName),
            'start_date' => $startDate->toDateString(),
            'due_date' => $dueDate->toDateString(),
            'priority' => $priority,
            'progress' => $progress,
        ], $company);

        // History, as it would have happened: created a few days before it started, and a done
        // task completed on its due date rather than today.
        $task->forceFill([
            'created_at' => $startDate->copy()->subDays(3)->setTime(9, 0),
            'completed_at' => $task->completed_at ? $dueDate->copy()->setTime(17, 0) : null,
        ])->saveQuietly();

        return 1;
    }

    /** @return array{0: int, 1: int} [total, new] */
    private function seedChecklists(): array
    {
        $total = 0;
        $new = 0;
        foreach (self::CHECKLISTS as $key => $items) {
            [$projectKey, $title] = explode('|', $key, 2);
            $task = Task::query()->whereHas('project', fn ($q) => $q->where('name', self::P[$projectKey]))->where('title', $title)->first();
            if (! $task) {
                continue;
            }
            foreach ($items as $index => [$item, $done]) {
                $total++;
                if (TaskChecklistItem::query()->where('task_id', $task->getKey())->where('title', $item)->exists()) {
                    continue;
                }
                $row = $task->checklistItems()->make(['title' => $item, 'is_completed' => $done]);
                $row->forceFill(['position' => $index + 1])->save();
                $new++;
            }
        }

        return [$total, $new];
    }
}
