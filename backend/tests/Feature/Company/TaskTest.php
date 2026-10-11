<?php

use App\Enums\TaskPriority;
use App\Models\Media;
use App\Models\Milestone;
use App\Models\Plan;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskChecklistItem;
use App\Models\TaskFile;
use App\Models\TaskStage;
use App\Models\User;
use App\Support\Tenancy\Tenancy;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/* /api/v1/tasks (PRD §6.4) — the board and list, CRUD, the drag (move), the stats, the business
   rules and tenant isolation. Checklist and files have their own files. */

beforeEach(function () {
    Carbon::setTestNow('2026-10-10 12:00:00');
    $plan = Plan::factory()->create(['max_projects' => Plan::UNLIMITED, 'storage_limit_gb' => '50.00']);
    $this->companyA = User::factory()->company()->create(['name' => 'Company A', 'email' => 'a@example.com']);
    $this->companyB = User::factory()->company()->create(['name' => 'Company B']);
    foreach ([$this->companyA, $this->companyB] as $company) {
        $company->forceFill(['plan_id' => $plan->id])->save();
    }
    $this->a = taskWorld($this->companyA);
    $this->b = taskWorld($this->companyB);
});

afterEach(fn () => Carbon::setTestNow());

/**
 * A company's board: To Do · In Progress · Cancelled · Done (done) and an inactive stage; two
 * projects, each with a milestone.
 *
 * @return array{stages: array<string, TaskStage>, project: Project, other: Project, milestone: Milestone, otherMilestone: Milestone}
 */
function taskWorld(User $company): array
{
    return Tenancy::instance()->runAs($company, function () {
        $stages = [];
        foreach (['To Do', 'In Progress', 'Cancelled'] as $name) {
            $stages[$name] = TaskStage::factory()->create(['name' => $name]);
        }
        $stages['Done'] = TaskStage::factory()->done()->create(['name' => 'Done']);
        $stages['Parked'] = TaskStage::factory()->inactive()->create(['name' => 'Parked']);
        $project = Project::factory()->create(['name' => 'Alpha Project']);
        $other = Project::factory()->create(['name' => 'Beta Project']);

        return [
            'stages' => $stages,
            'project' => $project,
            'other' => $other,
            'milestone' => Milestone::factory()->for($project)->create(['title' => 'Phase 1: Launch']),
            'otherMilestone' => Milestone::factory()->for($other)->create(['title' => 'Beta Milestone']),
        ];
    });
}

/** A valid Add Task payload for that world. */
function taskPayload(array $world, array $overrides = []): array
{
    return [
        'title' => 'Code Review',
        'description' => 'Critical task for Workflow Automation Platform',
        'project_id' => $world['project']->id,
        'milestone_id' => $world['milestone']->id,
        'task_stage_id' => $world['stages']['To Do']->id,
        'start_date' => '2026-10-01',
        'due_date' => '2026-10-30',
        'priority' => 'urgent',
        'progress' => 40,
        ...$overrides,
    ];
}

/** Tasks made directly (factory), in that company's context. */
function tasksIn(User $company, TaskStage $stage, Project $project, int $count = 1, array $attributes = []): Collection
{
    return Tenancy::instance()->runAs($company, fn () => collect(range(1, $count))->map(fn ($i) => Task::factory()->create([
        'project_id' => $project->id, 'task_stage_id' => $stage->id, 'title' => ($attributes['title'] ?? 'Task').($count > 1 ? " $i" : ''), ...array_diff_key($attributes, ['title' => 1]),
    ])));
}

function actAsTaskUser(User $user): void
{
    test()->flushSession();
    Auth::forgetGuards();
    test()->actingAs($user, 'web');
}

/** [title => position] of a column, in board order. */
function columnOf(TaskStage $stage): array
{
    return DB::table('tasks')->where('task_stage_id', $stage->id)->whereNull('deleted_at')->orderBy('position')->pluck('position', 'title')->all();
}

// ───────────────────────────── 1. create

test('1. create → 201: company and creator from the session (body ignored), at the end of its column; display-ready resource', function () {
    actAsTaskUser($this->companyA);

    $first = $this->postJson(route('v1.tasks.store'), taskPayload($this->a, ['company_id' => $this->companyB->id, 'created_by' => $this->companyB->id, 'position' => 9, 'completed_at' => '2020-01-01']))
        ->assertCreated()
        ->assertJsonPath('data.title', 'Code Review')
        ->assertJsonPath('data.project', ['id' => $this->a['project']->id, 'name' => 'Alpha Project'])
        ->assertJsonPath('data.milestone', ['id' => $this->a['milestone']->id, 'title' => 'Phase 1: Launch'])
        ->assertJsonPath('data.stage.name', 'To Do')
        ->assertJsonPath('data.stage.is_done_stage', false)
        ->assertJsonPath('data.priority', 'urgent')
        ->assertJsonPath('data.priority_label', 'Urgent')
        ->assertJsonPath('data.progress', 40)
        ->assertJsonPath('data.position', 1)
        ->assertJsonPath('data.completed_at', null)
        ->assertJsonPath('data.is_overdue', false)
        ->assertJsonPath('data.checklist_summary', ['total' => 0, 'completed' => 0])
        ->assertJsonPath('data.files_count', 0)
        ->assertJsonPath('data.created_by.name', 'Company A')
        ->assertJsonPath('data.created_by.email', 'a@example.com')
        ->assertJsonMissingPath('data.company_id')
        ->json('data');

    $row = DB::table('tasks')->where('id', $first['id'])->first();
    expect([$row->company_id, $row->created_by, $row->position, $row->completed_at])->toBe([$this->companyA->id, $this->companyA->id, 1, null]);

    $this->postJson(route('v1.tasks.store'), taskPayload($this->a, ['title' => 'Second']))->assertCreated()->assertJsonPath('data.position', 2);
});

test('created straight into the done stage: progress 100 and completed_at set; an empty progress is 0', function () {
    actAsTaskUser($this->companyA);

    $this->postJson(route('v1.tasks.store'), taskPayload($this->a, ['task_stage_id' => $this->a['stages']['Done']->id, 'progress' => 20]))
        ->assertCreated()->assertJsonPath('data.progress', 100)->assertJsonPath('data.completed_at', '2026-10-10T12:00:00+00:00');
    $this->postJson(route('v1.tasks.store'), taskPayload($this->a, ['title' => 'No progress', 'progress' => null, 'priority' => null]))
        ->assertUnprocessable(); // priority: sometimes, but not null
    $this->postJson(route('v1.tasks.store'), array_diff_key(taskPayload($this->a, ['title' => 'No progress', 'progress' => null]), ['priority' => 1]))
        ->assertCreated()->assertJsonPath('data.progress', 0)->assertJsonPath('data.priority', 'medium');
});

// ───────────────────────────── 2–3. validation

test('2. a milestone of another project → 422; another company\'s project, milestone or stage → 422; an inactive stage → 422', function (Closure $overrides, string $field, string $message) {
    actAsTaskUser($this->companyA);

    $this->postJson(route('v1.tasks.store'), taskPayload($this->a, $overrides->call($this)))
        ->assertUnprocessable()->assertJsonValidationErrors([$field => $message]);
    expect(DB::table('tasks')->count())->toBe(0);
})->with([
    'milestone of another project' => [fn () => ['milestone_id' => $this->a['otherMilestone']->id], 'milestone_id', 'Select a milestone of the selected project.'],
    'another company\'s project' => [fn () => ['project_id' => $this->b['project']->id, 'milestone_id' => null], 'project_id', 'Select one of your projects.'],
    'another company\'s milestone' => [fn () => ['milestone_id' => $this->b['milestone']->id], 'milestone_id', 'Select a milestone of the selected project.'],
    'another company\'s stage' => [fn () => ['task_stage_id' => $this->b['stages']['To Do']->id], 'task_stage_id', 'Select one of your active stages.'],
    'an inactive stage' => [fn () => ['task_stage_id' => $this->a['stages']['Parked']->id], 'task_stage_id', 'Select one of your active stages.'],
]);

test('3. field rules: required fields, due before start, progress outside 0–100 or not whole, unknown priority', function (array $payload, string $field) {
    actAsTaskUser($this->companyA);

    $this->postJson(route('v1.tasks.store'), taskPayload($this->a, $payload))->assertUnprocessable()->assertJsonValidationErrors([$field]);
})->with([
    'title missing' => [['title' => ''], 'title'],
    'title too long' => [['title' => str_repeat('x', 256)], 'title'],
    'project missing' => [['project_id' => null], 'project_id'],
    'stage missing' => [['task_stage_id' => null], 'task_stage_id'],
    'start missing' => [['start_date' => ''], 'start_date'],
    'due missing' => [['due_date' => ''], 'due_date'],
    'due before start' => [['start_date' => '2026-10-10', 'due_date' => '2026-10-09'], 'due_date'],
    'bad date' => [['due_date' => '10/30/2026'], 'due_date'],
    'progress 101' => [['progress' => 101], 'progress'],
    'progress -1' => [['progress' => -1], 'progress'],
    'progress 5.5' => [['progress' => 5.5], 'progress'],
    'priority unknown' => [['priority' => 'critical'], 'priority'],
]);

test('the due date may equal the start date; the messages are the modal\'s', function () {
    actAsTaskUser($this->companyA);

    $this->postJson(route('v1.tasks.store'), taskPayload($this->a, ['start_date' => '2026-10-10', 'due_date' => '2026-10-10']))->assertCreated();
    $this->postJson(route('v1.tasks.store'), ['title' => ''])->assertUnprocessable()->assertJsonValidationErrors([
        'title' => 'The task title is required.', 'project_id' => 'Select a project.', 'task_stage_id' => 'Select a stage.',
        'start_date' => 'The start date is required.', 'due_date' => 'The due date is required.',
    ]);
    $this->postJson(route('v1.tasks.store'), taskPayload($this->a, ['start_date' => '2026-10-10', 'due_date' => '2026-10-01']))
        ->assertJsonValidationErrors(['due_date' => 'The due date can\'t be before the start date.']);
});

// ───────────────────────────── update

test('update: a project change drops an incompatible milestone; naming one of another project is a 422; a stage change lands last in the new column', function () {
    [$t1] = tasksIn($this->companyA, $this->a['stages']['In Progress'], $this->a['project'], 1, ['title' => 'Existing', 'milestone_id' => $this->a['milestone']->id]);
    $task = Tenancy::instance()->runAs($this->companyA, fn () => Task::factory()->create(['project_id' => $this->a['project']->id, 'task_stage_id' => $this->a['stages']['To Do']->id, 'milestone_id' => $this->a['milestone']->id, 'title' => 'Mover']));
    actAsTaskUser($this->companyA);

    $payload = array_diff_key(taskPayload($this->a, ['title' => 'Mover', 'project_id' => $this->a['other']->id]), ['milestone_id' => 1]);
    $this->putJson(route('v1.tasks.update', $task), $payload)->assertOk()->assertJsonPath('data.milestone', null)->assertJsonPath('data.project.name', 'Beta Project');

    $this->putJson(route('v1.tasks.update', $task), taskPayload($this->a, ['project_id' => $this->a['other']->id, 'milestone_id' => $this->a['milestone']->id]))
        ->assertUnprocessable()->assertJsonValidationErrors(['milestone_id']);

    $this->putJson(route('v1.tasks.update', $task), taskPayload($this->a, ['title' => 'Mover', 'task_stage_id' => $this->a['stages']['In Progress']->id]))
        ->assertOk()->assertJsonPath('data.stage.name', 'In Progress')->assertJsonPath('data.position', 2);
    expect(columnOf($this->a['stages']['To Do']))->toBe([])->and(columnOf($this->a['stages']['In Progress']))->toBe(['Existing' => 1, 'Mover' => 2]);
});

test('an edit may keep a stage deactivated since, but not move to another inactive one', function () {
    $task = tasksIn($this->companyA, $this->a['stages']['In Progress'], $this->a['project'])->first();
    DB::table('task_stages')->where('id', $this->a['stages']['In Progress']->id)->update(['status' => 'inactive']);
    actAsTaskUser($this->companyA);

    $this->putJson(route('v1.tasks.update', $task), taskPayload($this->a, ['task_stage_id' => $this->a['stages']['In Progress']->id]))->assertOk();
    $this->putJson(route('v1.tasks.update', $task), taskPayload($this->a, ['task_stage_id' => $this->a['stages']['Parked']->id]))
        ->assertUnprocessable()->assertJsonValidationErrors(['task_stage_id']);
});

// ───────────────────────────── 4–6. move

test('4. moving into the done stage sets progress 100 and completed_at; moving out clears completed_at and keeps the progress', function () {
    $task = tasksIn($this->companyA, $this->a['stages']['In Progress'], $this->a['project'], 1, ['progress' => 30])->first();
    actAsTaskUser($this->companyA);

    $this->patchJson(route('v1.tasks.move', $task), ['task_stage_id' => $this->a['stages']['Done']->id, 'position' => 1])
        ->assertOk()->assertJsonPath('data.progress', 100)->assertJsonPath('data.completed_at', '2026-10-10T12:00:00+00:00')->assertJsonPath('data.stage.is_done_stage', true);

    Carbon::setTestNow('2026-10-12 08:00:00');
    $this->patchJson(route('v1.tasks.move', $task), ['task_stage_id' => $this->a['stages']['Done']->id, 'position' => 1])
        ->assertJsonPath('data.completed_at', '2026-10-10T12:00:00+00:00'); // reordering inside Done keeps the date

    $this->patchJson(route('v1.tasks.move', $task), ['task_stage_id' => $this->a['stages']['To Do']->id, 'position' => 1])
        ->assertOk()->assertJsonPath('data.completed_at', null)->assertJsonPath('data.progress', 100);
});

test('5. a move rewrites both columns contiguously; reordering within a column; a position past the end lands last', function () {
    $todo = $this->a['stages']['To Do'];
    $doing = $this->a['stages']['In Progress'];
    $t = tasksIn($this->companyA, $todo, $this->a['project'], 4, ['title' => 'T']);
    $d = tasksIn($this->companyA, $doing, $this->a['project'], 2, ['title' => 'D']);
    actAsTaskUser($this->companyA);

    $this->patchJson(route('v1.tasks.move', $t[1]), ['task_stage_id' => $doing->id, 'position' => 2])->assertOk()->assertJsonPath('data.position', 2);
    expect(columnOf($todo))->toBe(['T 1' => 1, 'T 3' => 2, 'T 4' => 3])
        ->and(columnOf($doing))->toBe(['D 1' => 1, 'T 2' => 2, 'D 2' => 3]);

    $this->patchJson(route('v1.tasks.move', $t[3]), ['task_stage_id' => $todo->id, 'position' => 1])->assertOk();
    expect(columnOf($todo))->toBe(['T 4' => 1, 'T 1' => 2, 'T 3' => 3]);

    $this->patchJson(route('v1.tasks.move', $d[0]), ['task_stage_id' => $todo->id, 'position' => 99])->assertOk()->assertJsonPath('data.position', 4);
    expect(columnOf($todo))->toBe(['T 4' => 1, 'T 1' => 2, 'T 3' => 3, 'D 1' => 4])
        ->and(columnOf($doing))->toBe(['T 2' => 1, 'D 2' => 2]);

    $this->patchJson(route('v1.tasks.move', $t[0]), ['task_stage_id' => $todo->id, 'position' => 0])->assertUnprocessable()->assertJsonValidationErrors(['position']);
});

test('6. moving to another company\'s stage, or another company\'s task → 404; to an inactive stage → 422; nothing moves', function () {
    $mine = tasksIn($this->companyA, $this->a['stages']['To Do'], $this->a['project'])->first();
    $theirs = tasksIn($this->companyB, $this->b['stages']['To Do'], $this->b['project'])->first();
    actAsTaskUser($this->companyA);

    $this->patchJson(route('v1.tasks.move', $mine), ['task_stage_id' => $this->b['stages']['Done']->id, 'position' => 1])->assertNotFound();
    $this->patchJson(route('v1.tasks.move', $theirs), ['task_stage_id' => $this->a['stages']['Done']->id, 'position' => 1])->assertNotFound();
    $this->patchJson(route('v1.tasks.move', $mine), ['task_stage_id' => $this->a['stages']['Parked']->id, 'position' => 1])
        ->assertUnprocessable()->assertJsonValidationErrors(['task_stage_id' => 'Tasks can only move to an active stage.']);

    expect(DB::table('tasks')->where('id', $mine->id)->value('task_stage_id'))->toBe($this->a['stages']['To Do']->id)
        ->and(DB::table('tasks')->where('id', $theirs->id)->value('task_stage_id'))->toBe($this->b['stages']['To Do']->id);
});

// ───────────────────────────── 7–8. overdue and stats

test('7. is_overdue only when past due AND not in a done stage — a Cancelled task past due is overdue too', function () {
    $past = ['start_date' => '2026-09-01', 'due_date' => '2026-10-09'];
    $todoLate = tasksIn($this->companyA, $this->a['stages']['To Do'], $this->a['project'], 1, ['title' => 'Late', ...$past])->first();
    $cancelledLate = tasksIn($this->companyA, $this->a['stages']['Cancelled'], $this->a['project'], 1, ['title' => 'Cancelled late', ...$past])->first();
    $doneLate = tasksIn($this->companyA, $this->a['stages']['Done'], $this->a['project'], 1, ['title' => 'Done late', ...$past])->first();
    $dueToday = tasksIn($this->companyA, $this->a['stages']['To Do'], $this->a['project'], 1, ['title' => 'Due today', 'start_date' => '2026-10-01', 'due_date' => '2026-10-10'])->first();
    actAsTaskUser($this->companyA);

    $overdue = fn (Task $t) => $this->getJson(route('v1.tasks.show', $t))->json('data.is_overdue');
    expect([$overdue($todoLate), $overdue($cancelledLate), $overdue($doneLate), $overdue($dueToday)])->toBe([true, true, false, false])
        ->and($this->getJson(route('v1.tasks.stats'))->json('data.overdue'))->toBe(2);
});

test('8. stats: total, high (High + Urgent), low (Low + Medium), overdue and the five tab counts — updated by create, move and delete', function () {
    foreach (['low' => 1, 'medium' => 2, 'high' => 3, 'urgent' => 4] as $priority => $n) {
        tasksIn($this->companyA, $this->a['stages']['To Do'], $this->a['project'], $n, ['title' => ucfirst($priority), 'priority' => TaskPriority::from($priority)]);
    }
    tasksIn($this->companyB, $this->b['stages']['To Do'], $this->b['project'], 5, ['priority' => TaskPriority::Urgent]);
    actAsTaskUser($this->companyA);

    $this->getJson(route('v1.tasks.stats'))->assertExactJson(['data' => ['total' => 10, 'high' => 7, 'low' => 3, 'overdue' => 0, 'priorities' => ['low' => 1, 'medium' => 2, 'high' => 3, 'urgent' => 4]]]);

    $id = $this->postJson(route('v1.tasks.store'), taskPayload($this->a, ['priority' => 'low', 'start_date' => '2026-09-01', 'due_date' => '2026-10-01']))->json('data.id');
    $this->getJson(route('v1.tasks.stats'))->assertJsonPath('data.total', 11)->assertJsonPath('data.low', 4)->assertJsonPath('data.overdue', 1);

    $this->patchJson(route('v1.tasks.move', $id), ['task_stage_id' => $this->a['stages']['Done']->id, 'position' => 1]);
    $this->getJson(route('v1.tasks.stats'))->assertJsonPath('data.overdue', 0);

    $this->deleteJson(route('v1.tasks.destroy', $id))->assertNoContent();
    $this->getJson(route('v1.tasks.stats'))->assertJsonPath('data.total', 10)->assertJsonPath('data.priorities.low', 1);
});

// ───────────────────────────── 9. board, list, search and filters

test('the board: every active stage in order (inactive ones not), each with its tasks in column order and a count', function () {
    tasksIn($this->companyA, $this->a['stages']['In Progress'], $this->a['project'], 2, ['title' => 'Doing']);
    tasksIn($this->companyA, $this->a['stages']['Done'], $this->a['project'], 1, ['title' => 'Finished']);
    actAsTaskUser($this->companyA);

    $columns = $this->getJson(route('v1.tasks.index'))->assertOk()->json('data.columns');
    expect(collect($columns)->pluck('stage.name')->all())->toBe(['To Do', 'In Progress', 'Cancelled', 'Done'])
        ->and(collect($columns)->pluck('count')->all())->toBe([0, 2, 0, 1])
        ->and(collect($columns[1]['tasks'])->pluck('title')->all())->toBe(['Doing 1', 'Doing 2'])
        ->and(array_keys($columns[1]['stage']))->toBe(['id', 'name', 'color', 'order', 'is_done_stage']);
});

test('the board costs the same number of queries whatever its size (no N+1): stages, tasks with their counts, one per relation', function () {
    $queries = function (): int {
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson(route('v1.tasks.index'))->assertOk();
        $count = count(DB::getQueryLog());
        DB::disableQueryLog();

        return $count;
    };
    // Same relations on both boards (an eager load is skipped when no task has, say, a milestone).
    tasksIn($this->companyA, $this->a['stages']['To Do'], $this->a['project'], 3, ['milestone_id' => $this->a['milestone']->id]);
    actAsTaskUser($this->companyA);
    $small = $queries();

    foreach (['In Progress', 'Cancelled', 'Done'] as $stage) {
        tasksIn($this->companyA, $this->a['stages'][$stage], $this->a['other'], 6, ['milestone_id' => $this->a['otherMilestone']->id]);
    }
    $large = $queries();

    expect($large)->toBe($small);
});

test('9. search (title, description) and every filter narrow the board and the list, alone and combined', function () {
    tasksIn($this->companyA, $this->a['stages']['To Do'], $this->a['project'], 1, ['title' => 'Payment Integration', 'priority' => TaskPriority::Urgent, 'milestone_id' => $this->a['milestone']->id]);
    tasksIn($this->companyA, $this->a['stages']['In Progress'], $this->a['project'], 1, ['title' => 'Shopping Cart', 'description' => 'Checkout and payment step', 'priority' => TaskPriority::High]);
    tasksIn($this->companyA, $this->a['stages']['Done'], $this->a['other'], 1, ['title' => 'Docs', 'priority' => TaskPriority::Low]);
    actAsTaskUser($this->companyA);
    $titles = fn (array $q) => collect($this->getJson(route('v1.tasks.index', ['view' => 'list', ...$q]))->assertOk()->json('data'))->pluck('title')->sort()->values()->all();
    $board = fn (array $q) => collect($this->getJson(route('v1.tasks.index', $q))->json('data.columns'))->flatMap(fn ($c) => collect($c['tasks'])->pluck('title'))->sort()->values()->all();

    expect($titles(['search' => 'payment']))->toBe(['Payment Integration', 'Shopping Cart'])
        ->and($titles(['search' => '50%_']))->toBe([])
        ->and($titles(['project_id' => $this->a['other']->id]))->toBe(['Docs'])
        ->and($titles(['milestone_id' => $this->a['milestone']->id]))->toBe(['Payment Integration'])
        ->and($titles(['task_stage_id' => $this->a['stages']['In Progress']->id]))->toBe(['Shopping Cart'])
        ->and($titles(['priority' => 'urgent']))->toBe(['Payment Integration'])
        ->and($titles(['search' => 'payment', 'priority' => 'high']))->toBe(['Shopping Cart'])
        ->and($titles(['project_id' => $this->a['project']->id, 'task_stage_id' => $this->a['stages']['Done']->id]))->toBe([])
        ->and($board(['search' => 'payment', 'project_id' => $this->a['project']->id]))->toBe(['Payment Integration', 'Shopping Cart']);

    $this->getJson(route('v1.tasks.index', ['priority' => 'critical']))->assertUnprocessable();
    $this->getJson(route('v1.tasks.index', ['view' => 'kanban']))->assertUnprocessable();
});

test('the list: paginated (10, max 100), sortable by a whitelist only; priority sorts Low → Urgent', function () {
    foreach (['low', 'urgent', 'medium', 'high'] as $i => $p) {
        tasksIn($this->companyA, $this->a['stages']['To Do'], $this->a['project'], 1, ['title' => ucfirst($p), 'priority' => TaskPriority::from($p), 'due_date' => '2026-10-2'.$i]);
    }
    tasksIn($this->companyA, $this->a['stages']['To Do'], $this->a['project'], 8, ['title' => 'Filler', 'due_date' => '2026-12-01']);
    actAsTaskUser($this->companyA);

    $this->getJson(route('v1.tasks.index', ['view' => 'list']))->assertOk()->assertJsonPath('meta.total', 12)->assertJsonPath('meta.per_page', 10)
        ->assertJsonPath('data.0.title', 'Low'); // default: soonest due first
    expect(collect($this->getJson(route('v1.tasks.index', ['view' => 'list', 'sort' => 'priority', 'direction' => 'desc', 'per_page' => 4]))->json('data'))->pluck('priority')->all())
        ->toBe(['urgent', 'high', 'medium', 'medium']);
    $this->getJson(route('v1.tasks.index', ['view' => 'list', 'sort' => 'company_id']))->assertUnprocessable()->assertJsonValidationErrors(['sort']);
    $this->getJson(route('v1.tasks.index', ['view' => 'list', 'per_page' => 101]))->assertUnprocessable();
});

// ───────────────────────────── 12. delete

test('12. delete soft-deletes the task, removes its checklist items and file links, keeps the media and closes the column', function () {
    $t = tasksIn($this->companyA, $this->a['stages']['To Do'], $this->a['project'], 3, ['title' => 'T']);
    [$media, $link] = Tenancy::instance()->runAs($this->companyA, function () use ($t) {
        TaskChecklistItem::factory()->for($t[1])->count(2)->create();
        $media = Media::factory()->create();
        $link = new TaskFile;
        $link->forceFill(['task_id' => $t[1]->id, 'media_id' => $media->id])->save();

        return [$media, $link];
    });
    actAsTaskUser($this->companyA);

    $this->deleteJson(route('v1.tasks.destroy', $t[1]))->assertNoContent();

    expect(DB::table('tasks')->where('id', $t[1]->id)->value('deleted_at'))->not->toBeNull()
        ->and(DB::table('task_checklist_items')->where('task_id', $t[1]->id)->count())->toBe(0)
        ->and(DB::table('task_files')->where('id', $link->id)->exists())->toBeFalse()
        ->and(DB::table('media')->where('id', $media->id)->whereNull('deleted_at')->exists())->toBeTrue()
        ->and(columnOf($this->a['stages']['To Do']))->toBe(['T 1' => 1, 'T 3' => 2]);
    $this->getJson(route('v1.tasks.show', $t[1]))->assertNotFound();
});

test('deleting a project deletes its tasks (and closes the columns); deleting a milestone unlinks its tasks', function () {
    $keep = tasksIn($this->companyA, $this->a['stages']['To Do'], $this->a['other'], 1, ['title' => 'Keep'])->first();
    $gone = tasksIn($this->companyA, $this->a['stages']['To Do'], $this->a['project'], 2, ['title' => 'Gone']);
    $linked = tasksIn($this->companyA, $this->a['stages']['In Progress'], $this->a['other'], 1, ['title' => 'Linked', 'milestone_id' => $this->a['otherMilestone']->id])->first();
    actAsTaskUser($this->companyA);

    $this->deleteJson(route('v1.milestones.destroy', $this->a['otherMilestone']))->assertNoContent();
    expect(DB::table('tasks')->where('id', $linked->id)->value('milestone_id'))->toBeNull();

    $this->deleteJson(route('v1.projects.destroy', $this->a['project']))->assertNoContent();
    expect(DB::table('tasks')->whereIn('id', $gone->pluck('id'))->whereNull('deleted_at')->count())->toBe(0)
        ->and(columnOf($this->a['stages']['To Do']))->toBe(['Keep' => 1]);
});

// ───────────────────────────── 13–14. isolation and access

test('13. company A cannot read, update, move or delete company B\'s task — all 404, nothing changes; nothing of B ever lists', function () {
    $theirs = tasksIn($this->companyB, $this->b['stages']['To Do'], $this->b['project'], 1, ['title' => 'B secret'])->first();
    tasksIn($this->companyA, $this->a['stages']['To Do'], $this->a['project'], 1, ['title' => 'A task']);
    actAsTaskUser($this->companyA);

    $this->getJson(route('v1.tasks.show', $theirs))->assertNotFound();
    $this->putJson(route('v1.tasks.update', $theirs), taskPayload($this->a))->assertNotFound();
    $this->patchJson(route('v1.tasks.move', $theirs), ['task_stage_id' => $this->a['stages']['Done']->id, 'position' => 1])->assertNotFound();
    $this->deleteJson(route('v1.tasks.destroy', $theirs))->assertNotFound();

    $board = collect($this->getJson(route('v1.tasks.index'))->json('data.columns'));
    expect($board->pluck('stage.id')->all())->toBe(collect($this->a['stages'])->except('Parked')->pluck('id')->values()->all())
        ->and($board->flatMap(fn ($c) => collect($c['tasks'])->pluck('title'))->all())->toBe(['A task'])
        ->and(collect($this->getJson(route('v1.tasks.index', ['view' => 'list', 'search' => 'secret']))->json('data')))->toBeEmpty()
        ->and($this->getJson(route('v1.tasks.index', ['view' => 'list', 'project_id' => $this->b['project']->id]))->json('meta.total'))->toBe(0)
        ->and($this->getJson(route('v1.tasks.stats'))->json('data.total'))->toBe(1)
        ->and(DB::table('tasks')->where('id', $theirs->id)->value('title'))->toBe('B secret');
});

test('14. a guest gets 401 and a super admin 403 on every task route', function (string $method, string $route, bool $bound) {
    $task = tasksIn($this->companyA, $this->a['stages']['To Do'], $this->a['project'])->first();
    $url = $bound ? route($route, $task) : route($route);

    $this->json($method, $url, taskPayload($this->a))->assertUnauthorized();
    actAsTaskUser(User::factory()->superAdmin()->create());
    $this->json($method, $url, taskPayload($this->a))->assertForbidden();

    expect(DB::table('tasks')->whereNull('deleted_at')->count())->toBe(1);
})->with([
    'index' => ['GET', 'v1.tasks.index', false],
    'stats' => ['GET', 'v1.tasks.stats', false],
    'store' => ['POST', 'v1.tasks.store', false],
    'show' => ['GET', 'v1.tasks.show', true],
    'update' => ['PUT', 'v1.tasks.update', true],
    'move' => ['PATCH', 'v1.tasks.move', true],
    'destroy' => ['DELETE', 'v1.tasks.destroy', true],
]);
