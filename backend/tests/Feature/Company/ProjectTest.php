<?php

use App\Enums\ClientStatus;
use App\Enums\MilestoneStatus;
use App\Enums\ProjectPriority;
use App\Enums\ProjectStatus;
use App\Models\Client;
use App\Models\Expense;
use App\Models\Media;
use App\Models\Milestone;
use App\Models\Plan;
use App\Models\Project;
use App\Models\ProjectFile;
use App\Models\ProjectItem;
use App\Models\ProjectNote;
use App\Models\User;
use App\Support\Tenancy\Tenancy;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;

/* /api/v1/projects and /api/v1/…/milestones — tenant-scoped (PRD §6.3, CLAUDE.md §7). The plan
   limits have their own file (PlanLimitTest); here both companies are on an unlimited plan. */

beforeEach(function () {
    $unlimited = Plan::factory()->create(['max_projects' => Plan::UNLIMITED, 'storage_limit_gb' => '50.00']);
    $this->companyA = User::factory()->company()->create(['name' => 'Company A']);
    $this->companyB = User::factory()->company()->create(['name' => 'Company B']);
    foreach ([$this->companyA, $this->companyB] as $company) {
        $company->forceFill(['plan_id' => $unlimited->id])->save();
    }
    $this->clientA = Tenancy::instance()->runAs($this->companyA, fn () => Client::factory()->create(['name' => 'Emily Davis', 'email' => 'emily.davis@example.com']));
    $this->clientB = Tenancy::instance()->runAs($this->companyB, fn () => Client::factory()->create(['name' => 'B Client']));
});

/** A valid Add Project payload. */
function projectPayload(int $clientId, array $overrides = []): array
{
    return [
        'name' => 'Enterprise Digital Transformation',
        'description' => 'Complete digital transformation initiative with cloud migration',
        'client_id' => $clientId,
        'start_date' => '2026-03-08',
        'end_date' => '2026-07-28',
        'budget' => '850000.00',
        'priority' => 'high',
        'status' => 'active',
        ...$overrides,
    ];
}

/** Projects for a company (each with its own client in that company), the way seeders do. */
function projectsFor(User $company, int $count = 1, array $attributes = []): Collection
{
    return Tenancy::instance()->runAs($company, fn () => Project::factory()->count($count)->create($attributes));
}

/** Switch the signed-in user; the session is flushed (see ExpenseCategoryTest). */
function actAsProjectUser(User $user): void
{
    test()->flushSession();
    Auth::forgetGuards();
    test()->actingAs($user, 'web');
}

// ───────────────────────────── create / update

test('create → 201 under the authenticated company (company_id / id in the body ignored); display-ready fields; progress 0', function () {
    actAsProjectUser($this->companyA);

    $response = $this->postJson(route('v1.projects.store'), projectPayload($this->clientA->id, ['company_id' => $this->companyB->id, 'id' => 999]))
        ->assertCreated()
        ->assertJsonPath('data.name', 'Enterprise Digital Transformation')
        ->assertJsonPath('data.client.name', 'Emily Davis')
        ->assertJsonPath('data.client.email', 'emily.davis@example.com')
        ->assertJsonPath('data.client.initials', 'ED')
        ->assertJsonPath('data.start_date', '2026-03-08')
        ->assertJsonPath('data.budget', '850000.00')
        ->assertJsonPath('data.progress', 0)
        ->assertJsonPath('data.can_toggle', true)
        ->assertJsonMissingPath('data.company_id');

    $id = $response->json('data.id');
    $row = DB::table('projects')->where('id', $id)->first();
    expect($row->company_id)->toBe($this->companyA->id)->and($id)->not->toBe(999);
});

test('priority and status default to Medium and Active when not sent', function () {
    actAsProjectUser($this->companyA);
    $payload = projectPayload($this->clientA->id);
    unset($payload['priority'], $payload['status']);

    $this->postJson(route('v1.projects.store'), $payload)
        ->assertCreated()
        ->assertJsonPath('data.priority', 'medium')
        ->assertJsonPath('data.priority_label', 'Medium')
        ->assertJsonPath('data.status', 'active')
        ->assertJsonPath('data.status_label', 'Active');
});

test('the client must be one of this company\'s active clients: another company\'s, an inactive or an unknown one → 422', function () {
    $inactive = Tenancy::instance()->runAs($this->companyA, fn () => Client::factory()->inactive()->create());
    actAsProjectUser($this->companyA);

    foreach ([$this->clientB->id, $inactive->id, 999999] as $clientId) {
        $this->postJson(route('v1.projects.store'), projectPayload($clientId))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['client_id' => 'Select one of your active clients.']);
    }
    expect(DB::table('projects')->count())->toBe(0);
});

test('field rules: required fields, end before start, negative / over-precise budget', function (string $field, mixed $value, string $message) {
    actAsProjectUser($this->companyA);

    $this->postJson(route('v1.projects.store'), projectPayload($this->clientA->id, [$field => $value]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors([$field => $message]);
})->with([
    'name missing' => ['name', '', 'The project name is required.'],
    'name too long' => ['name', str_repeat('a', 256), 'The project name may not be longer than 255 characters.'],
    'client missing' => ['client_id', null, 'Select a client.'],
    'start missing' => ['start_date', '', 'The start date is required.'],
    'start not a date' => ['start_date', '08/03/2026', 'Enter a valid start date.'],
    'end before start' => ['end_date', '2026-03-07', 'The end date can\'t be before the start date.'],
    'budget missing' => ['budget', '', 'The budget is required.'],
    'budget negative' => ['budget', '-1', 'The budget can\'t be negative.'],
    'budget 3 decimals' => ['budget', '10.123', 'The budget can have at most 2 decimal places.'],
    'budget text' => ['budget', 'lots', 'Enter the budget as a number.'],
    'unknown priority' => ['priority', 'critical', 'The selected priority is invalid.'],
    'unknown status' => ['status', 'archived', 'The selected status is invalid.'],
]);

test('an end date equal to the start date and a zero budget are fine', function () {
    actAsProjectUser($this->companyA);

    $this->postJson(route('v1.projects.store'), projectPayload($this->clientA->id, ['end_date' => '2026-03-08', 'budget' => '0']))
        ->assertCreated()
        ->assertJsonPath('data.budget', '0.00');
});

test('update saves; an edit may keep a client deactivated since, but not switch to another inactive one', function () {
    $project = projectsFor($this->companyA, 1, ['client_id' => $this->clientA->id])->first();
    $other = Tenancy::instance()->runAs($this->companyA, fn () => Client::factory()->inactive()->create());
    DB::table('clients')->where('id', $this->clientA->id)->update(['status' => ClientStatus::Inactive->value]);
    actAsProjectUser($this->companyA);

    $this->putJson(route('v1.projects.update', $project), projectPayload($this->clientA->id, ['name' => 'Renamed', 'status' => 'on_hold']))
        ->assertOk()
        ->assertJsonPath('data.name', 'Renamed')
        ->assertJsonPath('data.status', 'on_hold')
        ->assertJsonPath('data.can_toggle', false);

    $this->putJson(route('v1.projects.update', $project), projectPayload($other->id))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['client_id']);
});

// ───────────────────────────── tenant isolation

test('company A cannot read, update, delete or toggle company B\'s project — all 404, nothing changes', function () {
    $theirs = projectsFor($this->companyB, 1, ['name' => 'B Project', 'client_id' => $this->clientB->id])->first();
    actAsProjectUser($this->companyA);

    $this->getJson(route('v1.projects.show', $theirs))->assertNotFound();
    $this->putJson(route('v1.projects.update', $theirs), projectPayload($this->clientA->id, ['name' => 'Hijacked']))->assertNotFound();
    $this->patchJson(route('v1.projects.toggle-status', $theirs))->assertNotFound();
    $this->deleteJson(route('v1.projects.destroy', $theirs))->assertNotFound();
    $this->getJson(route('v1.projects.milestones.index', $theirs))->assertNotFound();
    $this->postJson(route('v1.projects.milestones.store', $theirs), ['title' => 'x', 'due_date' => '2026-05-01'])->assertNotFound();

    $row = DB::table('projects')->where('id', $theirs->id)->first();
    expect([$row->name, $row->status, $row->deleted_at])->toBe(['B Project', 'active', null])
        ->and(DB::table('milestones')->count())->toBe(0);
});

test('company A\'s list and stats never include company B\'s projects, whatever the filters', function (array $query) {
    projectsFor($this->companyA, 3, ['client_id' => $this->clientA->id, 'name' => 'Shared Name A']);
    projectsFor($this->companyB, 4, ['client_id' => $this->clientB->id, 'name' => 'Shared Name B', 'status' => ProjectStatus::Completed]);
    actAsProjectUser($this->companyA);

    $ids = collect($this->getJson(route('v1.projects.index', $query))->assertOk()->json('data'))->pluck('id');
    expect($ids->intersect(DB::table('projects')->where('company_id', $this->companyB->id)->pluck('id')))->toBeEmpty();

    $this->getJson(route('v1.projects.stats'))->assertExactJson(['data' => ['total' => 3, 'active' => 3, 'completed' => 0, 'on_hold' => 0, 'inactive' => 0]]);
})->with([
    'no filters' => [[]],
    'search' => [['search' => 'Shared']],
    'completed' => [['status' => 'completed']],
    'B\'s client id' => [fn () => ['client_id' => $this->clientB->id]],
    'sorted by budget, 100 per page' => [['sort' => 'budget', 'direction' => 'desc', 'per_page' => 100]],
]);

// ───────────────────────────── list

test('search matches name, description and client name; status, priority and client filters narrow', function () {
    $acme = Tenancy::instance()->runAs($this->companyA, fn () => Client::factory()->create(['name' => 'Acme Holdings']));
    Tenancy::instance()->runAs($this->companyA, function () use ($acme) {
        Project::factory()->create(['name' => 'Zeta Platform', 'client_id' => $this->clientA->id, 'priority' => ProjectPriority::Urgent]);
        Project::factory()->create(['name' => 'Beta', 'description' => 'Cloud migration', 'client_id' => $this->clientA->id, 'status' => ProjectStatus::OnHold]);
        Project::factory()->create(['name' => 'Gamma', 'description' => null, 'client_id' => $acme->id, 'status' => ProjectStatus::Completed]);
    });
    actAsProjectUser($this->companyA);
    $names = fn (array $q) => collect($this->getJson(route('v1.projects.index', $q))->assertOk()->json('data'))->pluck('name')->sort()->values()->all();

    expect($names(['search' => 'zeta']))->toBe(['Zeta Platform'])
        ->and($names(['search' => 'migration']))->toBe(['Beta'])
        ->and($names(['search' => 'acme']))->toBe(['Gamma'])
        ->and($names(['search' => '50%_']))->toBe([])
        ->and($names(['status' => 'on_hold']))->toBe(['Beta'])
        ->and($names(['priority' => 'urgent']))->toBe(['Zeta Platform'])
        ->and($names(['client_id' => $acme->id]))->toBe(['Gamma'])
        ->and($names(['status' => 'completed', 'client_id' => $this->clientA->id]))->toBe([]);

    $this->getJson(route('v1.projects.index', ['priority' => 'critical']))->assertUnprocessable();
});

test('the Created At range narrows inclusively; a "to" before "from" or a bad date → 422', function () {
    Tenancy::instance()->runAs($this->companyA, function () {
        foreach (['March' => '2026-03-15 10:00:00', 'April' => '2026-04-01 00:00:00', 'May' => '2026-05-31 23:59:59'] as $name => $at) {
            $project = Project::factory()->create(['name' => $name, 'client_id' => $this->clientA->id]);
            $project->forceFill(['created_at' => $at])->save();
        }
    });
    actAsProjectUser($this->companyA);
    $names = fn (array $q) => collect($this->getJson(route('v1.projects.index', $q))->assertOk()->json('data'))->pluck('name')->sort()->values()->all();

    expect($names(['created_from' => '2026-04-01']))->toBe(['April', 'May'])
        ->and($names(['created_to' => '2026-04-01']))->toBe(['April', 'March'])
        ->and($names(['created_from' => '2026-04-01', 'created_to' => '2026-05-31']))->toBe(['April', 'May'])
        ->and($names(['created_from' => '2026-06-01']))->toBe([]);

    $this->getJson(route('v1.projects.index', ['created_from' => '2026-05-01', 'created_to' => '2026-04-01']))
        ->assertUnprocessable()->assertJsonValidationErrors(['created_to']);
    $this->getJson(route('v1.projects.index', ['created_from' => '01/04/2026']))->assertUnprocessable()->assertJsonValidationErrors(['created_from']);
});

test('a sort outside the whitelist → 422; name, priority (Low → Urgent), status, budget and dates sort both ways', function () {
    Tenancy::instance()->runAs($this->companyA, function () {
        foreach ([['B', ProjectPriority::High, '300.00'], ['A', ProjectPriority::Low, '100.00'], ['D', ProjectPriority::Urgent, '50.00'], ['C', ProjectPriority::Medium, '900.00']] as [$name, $priority, $budget]) {
            Project::factory()->create(['name' => $name, 'priority' => $priority, 'budget' => $budget, 'client_id' => $this->clientA->id]);
        }
    });
    actAsProjectUser($this->companyA);
    $col = fn (string $sort, string $dir, string $field) => collect($this->getJson(route('v1.projects.index', ['sort' => $sort, 'direction' => $dir]))->assertOk()->json('data'))->pluck($field)->all();

    foreach (['company_id', 'client_id', 'description', 'name;drop table projects'] as $bad) {
        $this->getJson(route('v1.projects.index', ['sort' => $bad]))->assertUnprocessable()->assertJsonValidationErrors(['sort']);
    }
    expect($col('name', 'asc', 'name'))->toBe(['A', 'B', 'C', 'D'])
        ->and($col('name', 'desc', 'name'))->toBe(['D', 'C', 'B', 'A'])
        ->and($col('priority', 'asc', 'priority'))->toBe(['low', 'medium', 'high', 'urgent'])
        ->and($col('priority', 'desc', 'priority'))->toBe(['urgent', 'high', 'medium', 'low'])
        ->and($col('budget', 'asc', 'budget'))->toBe(['50.00', '100.00', '300.00', '900.00'])
        ->and($col('budget', 'desc', 'budget'))->toBe(['900.00', '300.00', '100.00', '50.00']);
    foreach (['status', 'start_date', 'end_date', 'created_at'] as $sort) {
        $this->getJson(route('v1.projects.index', ['sort' => $sort, 'direction' => 'desc']))->assertOk();
    }
});

test('pagination: 12 projects → two pages at the default 10; meta is correct; max 100', function () {
    projectsFor($this->companyA, 12, ['client_id' => $this->clientA->id]);
    actAsProjectUser($this->companyA);

    $this->getJson(route('v1.projects.index'))
        ->assertJsonCount(10, 'data')
        ->assertJsonPath('meta.total', 12)->assertJsonPath('meta.per_page', 10)->assertJsonPath('meta.last_page', 2);
    $this->getJson(route('v1.projects.index', ['page' => 2]))->assertJsonCount(2, 'data')->assertJsonPath('meta.from', 11);
    $this->getJson(route('v1.projects.index', ['per_page' => 101]))->assertUnprocessable();
});

test('stats count every status', function () {
    Tenancy::instance()->runAs($this->companyA, function () {
        foreach ([ProjectStatus::Active, ProjectStatus::Active, ProjectStatus::Completed, ProjectStatus::OnHold, ProjectStatus::Inactive] as $status) {
            Project::factory()->create(['status' => $status, 'client_id' => $this->clientA->id]);
        }
    });
    actAsProjectUser($this->companyA);

    $this->getJson(route('v1.projects.stats'))->assertExactJson(['data' => ['total' => 5, 'active' => 2, 'completed' => 1, 'on_hold' => 1, 'inactive' => 1]]);
});

// ───────────────────────────── toggle + delete

test('toggle switches Active ⇄ Inactive and refuses Completed and On Hold with its own message', function () {
    [$active, $completed, $onHold] = Tenancy::instance()->runAs($this->companyA, fn () => [
        Project::factory()->create(['client_id' => $this->clientA->id]),
        Project::factory()->create(['client_id' => $this->clientA->id, 'status' => ProjectStatus::Completed]),
        Project::factory()->create(['client_id' => $this->clientA->id, 'status' => ProjectStatus::OnHold]),
    ]);
    actAsProjectUser($this->companyA);

    $this->patchJson(route('v1.projects.toggle-status', $active))->assertOk()->assertJsonPath('data.status', 'inactive')->assertJsonPath('data.can_toggle', true);
    $this->patchJson(route('v1.projects.toggle-status', $active))->assertOk()->assertJsonPath('data.status', 'active');
    $this->patchJson(route('v1.projects.toggle-status', $completed))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['project' => 'Only active and inactive projects can be switched here. Edit the project to change it from completed.']);
    $this->patchJson(route('v1.projects.toggle-status', $onHold))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['project' => 'Only active and inactive projects can be switched here. Edit the project to change it from on hold.']);

    expect(DB::table('projects')->whereIn('id', [$completed->id, $onHold->id])->pluck('status')->sort()->values()->all())->toBe(['completed', 'on_hold']);
});

test('delete soft-deletes the project and its milestones, items, notes and expenses, removes its file links, and keeps the media', function () {
    $project = projectsFor($this->companyA, 1, ['client_id' => $this->clientA->id])->first();
    $media = Tenancy::instance()->runAs($this->companyA, function () use ($project) {
        Milestone::factory()->count(2)->for($project)->create();
        ProjectItem::factory()->count(2)->for($project)->create();
        ProjectNote::factory()->for($project)->create(['created_by' => $this->companyA->id]);
        Expense::factory()->count(3)->for($project)->create();
        $media = Media::factory()->create();
        $link = new ProjectFile;
        $link->forceFill(['project_id' => $project->id, 'media_id' => $media->id])->save();

        return $media;
    });
    actAsProjectUser($this->companyA);

    $this->deleteJson(route('v1.projects.destroy', $project))->assertNoContent();

    expect(DB::table('projects')->where('id', $project->id)->value('deleted_at'))->not->toBeNull();
    foreach (['milestones', 'project_items', 'project_notes', 'expenses'] as $table) {
        expect(DB::table($table)->where('project_id', $project->id)->whereNull('deleted_at')->count())->toBe(0, $table)
            ->and(DB::table($table)->where('project_id', $project->id)->count())->toBeGreaterThan(0, $table);
    }
    expect(DB::table('project_files')->where('project_id', $project->id)->count())->toBe(0)
        ->and(DB::table('media')->where('id', $media->id)->whereNull('deleted_at')->exists())->toBeTrue();
    $this->getJson(route('v1.projects.show', $project))->assertNotFound();
    $this->getJson(route('v1.projects.index'))->assertJsonPath('meta.total', 0);
});

// ───────────────────────────── details + honest figures

test('details: progress is 0 and health "Low" with no tasks (asserted explicitly), tasks and contracts 0, real milestone and budget figures, tab counts', function () {
    $project = projectsFor($this->companyA, 1, ['client_id' => $this->clientA->id, 'budget' => '850000.00'])->first();
    Tenancy::instance()->runAs($this->companyA, function () use ($project) {
        Milestone::factory()->for($project)->completed()->create();
        Milestone::factory()->for($project)->create(['status' => MilestoneStatus::InProgress, 'due_date' => Carbon::today()->subDays(3)->toDateString()]); // overdue
        Milestone::factory()->count(3)->for($project)->create(['status' => MilestoneStatus::Pending, 'due_date' => Carbon::today()->addDays(10)->toDateString()]);
        foreach (['1458.00', '1936.00', '321.00', '1336.00', '150.00', '70.00', '950.00'] as $amount) {
            Expense::factory()->for($project)->create(['amount' => $amount]);
        }
        ProjectItem::factory()->count(3)->for($project)->create();
        ProjectNote::factory()->count(2)->for($project)->create();
    });
    actAsProjectUser($this->companyA);

    $this->getJson(route('v1.projects.show', $project))
        ->assertOk()
        ->assertJsonPath('data.progress', 0)
        ->assertJsonPath('data.figures.progress', 0)
        ->assertJsonPath('data.figures.health', ['value' => 'low', 'label' => 'Low'])
        ->assertJsonPath('data.figures.tasks', ['total' => 0, 'completed' => 0])
        ->assertJsonPath('data.figures.contracts', ['active' => 0, 'total' => 0])
        ->assertJsonPath('data.figures.milestones', ['total' => 5, 'completed' => 1, 'percent' => 20])
        ->assertJsonPath('data.figures.overdue', 1)
        ->assertJsonPath('data.figures.budget', ['total' => '850000.00', 'spent' => '6221.00', 'remaining' => '843779.00', 'spent_percent' => 1, 'remaining_percent' => 99])
        ->assertJsonPath('data.counts', ['milestones' => 5, 'items' => 3, 'notes' => 2, 'expenses' => 7, 'files' => 0, 'contracts' => 0])
        ->assertJsonPath('data.client.name', 'Emily Davis');
});

test('the list resource exposes display-ready fields and never the owner', function () {
    projectsFor($this->companyA, 1, ['client_id' => $this->clientA->id]);
    actAsProjectUser($this->companyA);

    $row = $this->getJson(route('v1.projects.index'))->json('data.0');

    expect(array_keys($row))->toBe(['id', 'name', 'description', 'client', 'client_id', 'start_date', 'end_date', 'budget', 'priority', 'priority_label', 'status', 'status_label', 'can_toggle', 'progress', 'created_at', 'updated_at'])
        ->and(array_keys($row['client']))->toBe(['id', 'name', 'email', 'initials']);
});

test('Project::tasks() and contracts() are honest stubs until those modules exist', function () {
    $project = projectsFor($this->companyA)->first();

    expect(fn () => $project->tasks())->toThrow(LogicException::class)
        ->and(fn () => $project->contracts())->toThrow(LogicException::class);
});

// ───────────────────────────── milestones

test('milestones: create (company and project from the route), list in due-date order, update, delete', function () {
    $project = projectsFor($this->companyA, 1, ['client_id' => $this->clientA->id])->first();
    actAsProjectUser($this->companyA);

    $id = $this->postJson(route('v1.projects.milestones.store', $project), ['title' => 'Launch', 'due_date' => '2026-06-13', 'progress' => '', 'status' => 'in_progress', 'company_id' => $this->companyB->id, 'project_id' => 999])
        ->assertCreated()
        ->assertJsonPath('data.title', 'Launch')
        ->assertJsonPath('data.progress', 0)
        ->assertJsonPath('data.status_label', 'In Progress')
        ->assertJsonPath('data.due_date', '2026-06-13')
        ->json('data.id');
    $this->postJson(route('v1.projects.milestones.store', $project), ['title' => 'Planning', 'due_date' => '2026-05-16', 'progress' => 46, 'status' => 'completed'])->assertCreated();

    $row = DB::table('milestones')->where('id', $id)->first();
    expect([$row->company_id, $row->project_id])->toBe([$this->companyA->id, $project->id]);
    expect(collect($this->getJson(route('v1.projects.milestones.index', $project))->json('data'))->pluck('title')->all())->toBe(['Planning', 'Launch']);

    $this->putJson(route('v1.milestones.update', $id), ['title' => 'Launch v2', 'due_date' => '2026-06-20', 'progress' => 90, 'status' => 'completed'])
        ->assertOk()->assertJsonPath('data.title', 'Launch v2')->assertJsonPath('data.progress', 90);
    $this->deleteJson(route('v1.milestones.destroy', $id))->assertNoContent();
    expect(DB::table('milestones')->where('id', $id)->value('deleted_at'))->not->toBeNull()
        ->and($this->getJson(route('v1.projects.milestones.index', $project))->json('data'))->toHaveCount(1);
});

test('milestone rules: title and due date required, due not before start, progress 0–100, known status', function (array $payload, string $field) {
    $project = projectsFor($this->companyA, 1, ['client_id' => $this->clientA->id])->first();
    actAsProjectUser($this->companyA);

    $this->postJson(route('v1.projects.milestones.store', $project), [...['title' => 'Planning', 'due_date' => '2026-05-16'], ...$payload])
        ->assertUnprocessable()
        ->assertJsonValidationErrors([$field]);
})->with([
    'title missing' => [['title' => ''], 'title'],
    'due missing' => [['due_date' => ''], 'due_date'],
    'due before start' => [['start_date' => '2026-05-20', 'due_date' => '2026-05-16'], 'due_date'],
    'progress 101' => [['progress' => 101], 'progress'],
    'progress -1' => [['progress' => -1], 'progress'],
    'progress 1.5' => [['progress' => 1.5], 'progress'],
    'unknown status' => [['status' => 'done'], 'status'],
]);

test('company A cannot update or delete company B\'s milestone — 404', function () {
    $theirs = projectsFor($this->companyB, 1, ['client_id' => $this->clientB->id])->first();
    $milestone = Tenancy::instance()->runAs($this->companyB, fn () => Milestone::factory()->for($theirs)->create(['title' => 'B Milestone']));
    actAsProjectUser($this->companyA);

    $this->putJson(route('v1.milestones.update', $milestone), ['title' => 'Hijacked', 'due_date' => '2026-05-16'])->assertNotFound();
    $this->deleteJson(route('v1.milestones.destroy', $milestone))->assertNotFound();
    expect(DB::table('milestones')->where('id', $milestone->id)->value('title'))->toBe('B Milestone');
});

// ───────────────────────────── access

test('a guest gets 401 and a super admin 403 on every project and milestone route', function (string $method, string $route, string $bound) {
    $project = projectsFor($this->companyA, 1, ['client_id' => $this->clientA->id])->first();
    $milestone = Tenancy::instance()->runAs($this->companyA, fn () => Milestone::factory()->for($project)->create());
    $url = route($route, match ($bound) {
        'project' => $project, 'milestone' => $milestone, default => []
    });

    $this->json($method, $url, projectPayload($this->clientA->id))->assertUnauthorized();

    actAsProjectUser(User::factory()->superAdmin()->create());
    $this->json($method, $url, projectPayload($this->clientA->id))->assertForbidden()->assertJsonStructure(['message']);

    expect(DB::table('projects')->count())->toBe(1)
        ->and(DB::table('projects')->whereNull('deleted_at')->count())->toBe(1)
        ->and(DB::table('milestones')->whereNull('deleted_at')->count())->toBe(1);
})->with([
    'index' => ['GET', 'v1.projects.index', ''],
    'stats' => ['GET', 'v1.projects.stats', ''],
    'store' => ['POST', 'v1.projects.store', ''],
    'show' => ['GET', 'v1.projects.show', 'project'],
    'update' => ['PUT', 'v1.projects.update', 'project'],
    'destroy' => ['DELETE', 'v1.projects.destroy', 'project'],
    'toggle' => ['PATCH', 'v1.projects.toggle-status', 'project'],
    'milestones index' => ['GET', 'v1.projects.milestones.index', 'project'],
    'milestones store' => ['POST', 'v1.projects.milestones.store', 'project'],
    'milestone update' => ['PUT', 'v1.milestones.update', 'milestone'],
    'milestone destroy' => ['DELETE', 'v1.milestones.destroy', 'milestone'],
]);
