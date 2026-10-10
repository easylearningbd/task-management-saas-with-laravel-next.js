<?php

namespace Database\Seeders;

use App\Enums\MilestoneStatus;
use App\Enums\ProjectItemUnit;
use App\Enums\ProjectPriority;
use App\Enums\ProjectStatus;
use App\Models\Client;
use App\Models\ExpenseCategory;
use App\Models\Project;
use App\Models\User;
use App\Support\Tenancy\Tenancy;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/**
 * Demo projects — idempotent and additive: projects are matched on (company, name), their
 * milestones / items / notes / expenses on their own natural keys, deleted rows included (a
 * soft-deleted demo row is restored, never duplicated); nothing is deleted or truncated. Every
 * write happens inside Tenancy::runAs(), so BelongsToCompany stamps the right `company_id`.
 *
 *  - company@example.com: the 10 projects of the Projects list screenshot + 2 more (one
 *    Completed, one On Hold) → stat cards 12 / 6 active / 5 completed / 1 on hold, and a second
 *    page. The first (Enterprise Digital Transformation — the oldest, so first in the list's
 *    default oldest-first order) carries the details-page demo data: 5 milestones (1/5 complete), 3 items, 2 notes and 10 expenses totalling $6,221.00.
 *  - admin@healthcare.com: 2 projects of its own, so tenant isolation can be checked by hand.
 *
 * Clients and expense categories come from ClientSeeder / ExpenseCategorySeeder (looked up by
 * name; a missing one skips that row with a warning). Dates are relative to today; created
 * dates are only set when a row is first created, so a re-run changes nothing.
 *
 * Run: php artisan db:seed --class=ProjectSeeder
 */
class ProjectSeeder extends Seeder
{
    /** @var array<string, list<array{name: string, client: string, priority: string, status: string, budget: string, start: int, weeks: int, days_ago: int, description: string}>> */
    private const PROJECTS = [
        'company@example.com' => [
            ['name' => 'Enterprise Digital Transformation', 'client' => 'Emily Davis', 'priority' => 'high', 'status' => 'completed', 'budget' => '850000.00', 'start' => -210, 'weeks' => 20, 'days_ago' => 60, 'description' => 'End-to-end modernisation of legacy systems, processes and tooling across the organisation.'],
            ['name' => 'AI-Powered Analytics Platform', 'client' => 'Emily Davis', 'priority' => 'urgent', 'status' => 'active', 'budget' => '650000.00', 'start' => -60, 'weeks' => 30, 'days_ago' => 55, 'description' => 'Machine-learning analytics platform with self-service dashboards and forecasting.'],
            ['name' => 'Customer Experience Optimization', 'client' => 'John Smith', 'priority' => 'urgent', 'status' => 'completed', 'budget' => '580000.00', 'start' => -240, 'weeks' => 24, 'days_ago' => 50, 'description' => 'Journey mapping, UX research and service redesign across every customer touchpoint.'],
            ['name' => 'Supply Chain Management System', 'client' => 'Sarah Johnson', 'priority' => 'high', 'status' => 'active', 'budget' => '750000.00', 'start' => -45, 'weeks' => 36, 'days_ago' => 45, 'description' => 'Real-time visibility of inventory, suppliers and logistics in one system.'],
            ['name' => 'Mobile-First Application Suite', 'client' => 'Google Cloud Platform', 'priority' => 'high', 'status' => 'active', 'budget' => '420000.00', 'start' => -30, 'weeks' => 26, 'days_ago' => 40, 'description' => 'A family of mobile apps sharing one design system and backend.'],
            ['name' => 'Cybersecurity Enhancement Program', 'client' => 'Netflix Inc', 'priority' => 'high', 'status' => 'completed', 'budget' => '680000.00', 'start' => -300, 'weeks' => 30, 'days_ago' => 35, 'description' => 'Zero-trust rollout, threat monitoring and staff security training.'],
            ['name' => 'Data Lake and Analytics Infrastructure', 'client' => 'Emily Davis', 'priority' => 'high', 'status' => 'active', 'budget' => '920000.00', 'start' => -20, 'weeks' => 40, 'days_ago' => 30, 'description' => 'Central data lake with governed pipelines feeding analytics and reporting.'],
            ['name' => 'Workflow Automation Platform', 'client' => 'Apple Inc', 'priority' => 'urgent', 'status' => 'completed', 'budget' => '380000.00', 'start' => -200, 'weeks' => 18, 'days_ago' => 25, 'description' => 'Low-code automation of approval flows and recurring back-office tasks.'],
            ['name' => 'E-commerce Website', 'client' => 'John Smith', 'priority' => 'high', 'status' => 'active', 'budget' => '45000.00', 'start' => -15, 'weeks' => 12, 'days_ago' => 20, 'description' => 'Online store with catalogue, checkout and order tracking.'],
            ['name' => 'Mobile Banking App', 'client' => 'Sarah Johnson', 'priority' => 'urgent', 'status' => 'active', 'budget' => '75000.00', 'start' => -10, 'weeks' => 16, 'days_ago' => 15, 'description' => 'Secure mobile banking with transfers, card controls and notifications.'],
            // Not in the screenshot: one Completed and one On Hold, and a second page.
            ['name' => 'Healthcare Portal Redesign', 'client' => 'Michael Brown', 'priority' => 'medium', 'status' => 'on_hold', 'budget' => '120000.00', 'start' => -90, 'weeks' => 20, 'days_ago' => 10, 'description' => 'Accessible redesign of the patient-facing portal.'],
            ['name' => 'Inventory Tracking System', 'client' => 'David Wilson', 'priority' => 'low', 'status' => 'completed', 'budget' => '95000.00', 'start' => -180, 'weeks' => 14, 'days_ago' => 5, 'description' => 'Barcode-based stock tracking across warehouses.'],
        ],
        'admin@healthcare.com' => [
            ['name' => 'Patient Records Migration', 'client' => 'Mercy General Hospital', 'priority' => 'high', 'status' => 'active', 'budget' => '210000.00', 'start' => -25, 'weeks' => 24, 'days_ago' => 20, 'description' => 'Move patient records to the new EHR system.'],
            ['name' => 'Pharmacy Inventory Sync', 'client' => 'City Pharmacy Group', 'priority' => 'low', 'status' => 'on_hold', 'budget' => '40000.00', 'start' => -50, 'weeks' => 10, 'days_ago' => 12, 'description' => 'Nightly stock sync between pharmacy branches.'],
        ],
    ];

    /** The details-page demo data, attached to the first project of the demo company. */
    private const DETAILS_PROJECT = 'Enterprise Digital Transformation';

    /** @var list<array{title: string, description: string, due: int, progress: int, status: string}> (due = days after the project start) */
    private const MILESTONES = [
        ['title' => 'Planning', 'description' => 'Scope, requirements and the delivery plan.', 'due' => 21, 'progress' => 46, 'status' => 'completed'],
        ['title' => 'Development', 'description' => 'Build the platform features.', 'due' => 70, 'progress' => 73, 'status' => 'in_progress'],
        ['title' => 'Deployment', 'description' => 'Roll out to production environments.', 'due' => 105, 'progress' => 79, 'status' => 'in_progress'],
        ['title' => 'Launch', 'description' => 'Go-live and stakeholder sign-off.', 'due' => 125, 'progress' => 47, 'status' => 'in_progress'],
        ['title' => 'Launch', 'description' => 'Post-launch review and handover.', 'due' => 140, 'progress' => 90, 'status' => 'pending'],
    ];

    /** @var list<array{name: string, description: string, price: string, unit: string}> */
    private const ITEMS = [
        ['name' => 'Logo Design', 'description' => 'Professional logo design service', 'price' => '500.00', 'unit' => 'hours'],
        ['name' => 'Supply Chain Optimization', 'description' => 'Supply chain analysis and optimization', 'price' => '10291.00', 'unit' => 'package'],
        ['name' => 'Clinical Decision Support', 'description' => 'Clinical decision support system setup', 'price' => '4153.00', 'unit' => 'package'],
    ];

    /** @var list<array{title: string, content: string, days_ago: int}> */
    private const NOTES = [
        ['title' => 'Important project update: Budget approved', 'content' => 'The steering committee approved the full budget. Procurement can start on the hardware order.', 'days_ago' => 3],
        ['title' => 'Important project update: Budget approved', 'content' => 'Finance confirmed the second budget tranche; the training programme can be scheduled.', 'days_ago' => 1],
    ];

    /** @var list<array{title: string, category: string, amount: string, days_ago: int}> — totals $6,221.00 */
    private const EXPENSES = [
        ['title' => 'Training', 'category' => 'Meals', 'amount' => '1458.00', 'days_ago' => 2],
        ['title' => 'Training', 'category' => 'Software', 'amount' => '1936.00', 'days_ago' => 4],
        ['title' => 'Hardware Equipment', 'category' => 'Software', 'amount' => '321.00', 'days_ago' => 6],
        ['title' => 'Hardware Equipment', 'category' => 'Travel', 'amount' => '1336.00', 'days_ago' => 8],
        ['title' => 'Client Workshop Travel', 'category' => 'Travel', 'amount' => '150.00', 'days_ago' => 10],
        ['title' => 'Documentation Printing', 'category' => 'Office Supplies', 'amount' => '70.00', 'days_ago' => 12],
        ['title' => 'Marketing Collateral', 'category' => 'Marketing', 'amount' => '450.00', 'days_ago' => 14],
        ['title' => 'Team Lunch', 'category' => 'Meals', 'amount' => '250.00', 'days_ago' => 16],
        ['title' => 'Conference Travel', 'category' => 'Travel', 'amount' => '180.00', 'days_ago' => 18],
        ['title' => 'Cloud Credits', 'category' => 'Software', 'amount' => '70.00', 'days_ago' => 20],
    ];

    public function run(): void
    {
        $today = Carbon::today();

        foreach (self::PROJECTS as $companyEmail => $projects) {
            $company = User::query()->where('email', $companyEmail)->first();
            if (! $company || ! $company->isCompany()) {
                $this->command?->warn(sprintf('  %-26s skipped — no such company (run CompanySeeder first)', $companyEmail));

                continue;
            }

            Tenancy::instance()->runAs($company, function () use ($company, $companyEmail, $projects, $today) {
                DB::transaction(function () use ($company, $companyEmail, $projects, $today) {
                    $created = 0;
                    foreach ($projects as $row) {
                        $clientId = Client::withTrashed()->where('name', $row['client'])->value('id');
                        if (! $clientId) {
                            $this->command?->warn(sprintf('  %-26s "%s" skipped — no client "%s" (run ClientSeeder first)', $companyEmail, $row['name'], $row['client']));

                            continue;
                        }

                        $project = Project::withTrashed()->firstOrNew(['name' => $row['name']]);
                        $isNew = ! $project->exists;
                        $start = $today->copy()->addDays($row['start']);
                        $project->fill([
                            'client_id' => $clientId,
                            'description' => $row['description'],
                            'start_date' => $start,
                            'end_date' => $start->copy()->addWeeks($row['weeks']),
                            'budget' => $row['budget'],
                            'priority' => ProjectPriority::from($row['priority']),
                            'status' => ProjectStatus::from($row['status']),
                        ]);
                        if ($isNew) {
                            $project->created_at = $today->copy()->subDays($row['days_ago']);
                            $created++;
                        }
                        $project->deleted_at = null;
                        $project->save();

                        if ($row['name'] === self::DETAILS_PROJECT) {
                            $this->seedDetails($project, $company, $today);
                        }
                    }

                    $this->command?->info(sprintf('  %-26s %d projects (%d new)', $companyEmail, count($projects), $created));
                });
            });
        }
    }

    /** Milestones, items, notes and expenses for the details-page demo project. */
    private function seedDetails(Project $project, User $author, Carbon $today): void
    {
        foreach (self::MILESTONES as $row) {
            $milestone = $project->milestones()->withTrashed()->firstOrNew(['title' => $row['title'], 'description' => $row['description']]);
            $milestone->fill([
                'due_date' => $project->start_date->copy()->addDays($row['due']),
                'progress' => $row['progress'],
                'status' => MilestoneStatus::from($row['status']),
            ]);
            $milestone->deleted_at = null;
            $milestone->save();
        }

        foreach (self::ITEMS as $row) {
            $item = $project->items()->withTrashed()->firstOrNew(['name' => $row['name']]);
            $item->fill(['description' => $row['description'], 'default_price' => $row['price'], 'unit' => ProjectItemUnit::from($row['unit'])]);
            $item->deleted_at = null;
            $item->save();
        }

        foreach (self::NOTES as $row) {
            $note = $project->notes()->withTrashed()->firstOrNew(['title' => $row['title'], 'content' => $row['content']]);
            if (! $note->exists) {
                $note->forceFill(['created_by' => $author->id, 'created_at' => $today->copy()->subDays($row['days_ago'])]);
            }
            $note->deleted_at = null;
            $note->save();
        }

        $categories = ExpenseCategory::withTrashed()->pluck('id', 'name');
        foreach (self::EXPENSES as $row) {
            $categoryId = $categories[$row['category']] ?? null;
            if (! $categoryId) {
                $this->command?->warn(sprintf('    expense "%s" skipped — no category "%s" (run ExpenseCategorySeeder first)', $row['title'], $row['category']));

                continue;
            }

            $expense = $project->expenses()->withTrashed()->firstOrNew(['title' => $row['title'], 'amount' => $row['amount']]);
            $expense->fill(['expense_category_id' => $categoryId, 'expense_date' => $today->copy()->subDays($row['days_ago'])]);
            $expense->deleted_at = null;
            $expense->save();
        }
    }
}
