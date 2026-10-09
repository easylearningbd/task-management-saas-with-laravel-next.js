<?php

use App\Models\Company;
use App\Models\TaskStage;
use App\Models\User;
use App\Services\CompanySetupService;
use App\Support\Tenancy\Tenancy;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;

/* /api/v1/task-stages — tenant-scoped (PRD §6.13, CLAUDE.md §7), every workflow rule of
   TaskStageService, and the four defaults CompanySetupService gives every new company. */

beforeEach(function () {
    $this->companyA = User::factory()->company()->create(['name' => 'Company A']);
    $this->companyB = User::factory()->company()->create(['name' => 'Company B']);
});

/** A valid Add Stage payload. */
function stagePayload(array $overrides = []): array
{
    return [
        'name' => 'Review',
        'description' => 'Waiting for review',
        'color' => '#8B5CF6',
        'order' => null,
        'status' => 'active',
        'is_done_stage' => false,
        ...$overrides,
    ];
}

/**
 * A company's workflow the way setup builds it: To Do · In Progress · Cancelled · Done (done),
 * orders 1..4. Returns the stages keyed by name.
 *
 * @return Collection<string, TaskStage>
 */
function workflowFor(User $company): Collection
{
    return Tenancy::instance()->runAs($company, function () {
        $stages = collect();
        foreach (['To Do', 'In Progress', 'Cancelled'] as $name) {
            $stages[$name] = TaskStage::factory()->create(['name' => $name]);
        }
        $stages['Done'] = TaskStage::factory()->done()->create(['name' => 'Done']);

        return $stages;
    });
}

/** Switch the signed-in user; the session is flushed (see ExpenseCategoryTest::actAsCategoryUser). */
function actAsStageUser(User $user): void
{
    test()->flushSession();
    Auth::forgetGuards();
    test()->actingAs($user, 'web');
}

/** A company's live stages straight from the table, in order: [name, order, done, status]. */
function stageRows(User $company): array
{
    return DB::table('task_stages')->where('company_id', $company->id)->whereNull('deleted_at')
        ->orderBy('order')->get()
        ->map(fn ($r) => [$r->name, (int) $r->order, (bool) $r->is_done_stage, $r->status])->all();
}

/** Just the names, in order. */
function stageNames(User $company): array
{
    return array_column(stageRows($company), 0);
}

function stageRuleError(string $message): array
{
    return ['stage' => $message];
}

const STAGE_UNSET_DONE = 'The done stage can\'t be unset. Mark another stage as the done stage instead.';
const STAGE_DELETE_DONE = 'The done stage can\'t be deleted. Mark another stage as the done stage first.';
const STAGE_DEACTIVATE_DONE = 'The done stage can\'t be deactivated. Mark another stage as the done stage first.';
const STAGE_LAST_ACTIVE = 'At least one stage must stay active.';

// ───────────────────────────── create + order

test('1. create → 201 under the authenticated company; color uppercase; no order = appended at the end', function () {
    workflowFor($this->companyA);
    actAsStageUser($this->companyA);

    $response = $this->postJson(route('v1.task-stages.store'), stagePayload(['name' => '  Review ', 'color' => '#8b5cf6']))
        ->assertCreated()
        ->assertJsonPath('data.name', 'Review')
        ->assertJsonPath('data.color', '#8B5CF6')
        ->assertJsonPath('data.order', 5)
        ->assertJsonPath('data.is_done_stage', false)
        ->assertJsonPath('data.status_label', 'Active')
        ->assertJsonPath('data.tasks_count', 0)
        ->assertJsonMissingPath('data.company_id');

    expect(DB::table('task_stages')->where('id', $response->json('data.id'))->value('company_id'))->toBe($this->companyA->id)
        ->and(stageNames($this->companyA))->toBe(['To Do', 'In Progress', 'Cancelled', 'Done', 'Review']);
});

test('1b. a company_id (or id) in the payload is ignored', function () {
    workflowFor($this->companyA);
    actAsStageUser($this->companyA);

    $id = $this->postJson(route('v1.task-stages.store'), stagePayload(['company_id' => $this->companyB->id, 'id' => 999]))->assertCreated()->json('data.id');

    expect(DB::table('task_stages')->where('id', $id)->value('company_id'))->toBe($this->companyA->id)->and($id)->not->toBe(999);
});

test('2. an explicit order inserts there and renumbers the rest contiguously; past the end means last', function () {
    workflowFor($this->companyA);
    actAsStageUser($this->companyA);

    $this->postJson(route('v1.task-stages.store'), stagePayload(['name' => 'Review', 'order' => 2]))->assertCreated()->assertJsonPath('data.order', 2);
    expect(stageRows($this->companyA))->toBe([
        ['To Do', 1, false, 'active'], ['Review', 2, false, 'active'], ['In Progress', 3, false, 'active'],
        ['Cancelled', 4, false, 'active'], ['Done', 5, true, 'active'],
    ]);

    $this->postJson(route('v1.task-stages.store'), stagePayload(['name' => 'Backlog', 'order' => 1]))->assertJsonPath('data.order', 1);
    $this->postJson(route('v1.task-stages.store'), stagePayload(['name' => 'Archive', 'order' => 99]))->assertJsonPath('data.order', 7);
    expect(stageNames($this->companyA))->toBe(['Backlog', 'To Do', 'Review', 'In Progress', 'Cancelled', 'Done', 'Archive'])
        ->and(array_column(stageRows($this->companyA), 1))->toBe(range(1, 7));

    foreach ([0, -1, 'two', 1.5] as $bad) {
        $this->postJson(route('v1.task-stages.store'), stagePayload(['name' => 'Bad '.json_encode($bad), 'order' => $bad]))
            ->assertUnprocessable()->assertJsonValidationErrors(['order']);
    }
});

test('2b. editing the order moves the stage and keeps the sequence contiguous', function () {
    $stages = workflowFor($this->companyA);
    actAsStageUser($this->companyA);

    $this->putJson(route('v1.task-stages.update', $stages['Done']), stagePayload(['name' => 'Done', 'order' => 1, 'is_done_stage' => true]))
        ->assertOk()->assertJsonPath('data.order', 1);
    expect(stageNames($this->companyA))->toBe(['Done', 'To Do', 'In Progress', 'Cancelled']);

    $this->putJson(route('v1.task-stages.update', $stages['To Do']), stagePayload(['name' => 'To Do', 'order' => 4]))->assertOk();
    expect(stageNames($this->companyA))->toBe(['Done', 'In Progress', 'Cancelled', 'To Do'])
        ->and(array_column(stageRows($this->companyA), 1))->toBe([1, 2, 3, 4]);
});

test('3. the name is unique within a company, in any case; another company may use the same name', function (string $duplicate) {
    workflowFor($this->companyA);

    actAsStageUser($this->companyA);
    $this->postJson(route('v1.task-stages.store'), stagePayload(['name' => $duplicate]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['name' => 'A task stage with this name already exists.']);

    actAsStageUser($this->companyB);
    $this->postJson(route('v1.task-stages.store'), stagePayload(['name' => 'To Do']))->assertCreated();

    expect(DB::table('task_stages')->where('name', 'To Do')->count())->toBe(2);
})->with(['exact' => 'To Do', 'lower case' => 'to do', 'upper case' => 'TO DO', 'padded' => '  To Do  ']);

test('3b. a deleted stage\'s name restores that row at the requested position; an edit can\'t take it', function () {
    $stages = workflowFor($this->companyA);
    actAsStageUser($this->companyA);
    $this->deleteJson(route('v1.task-stages.destroy', $stages['Cancelled']))->assertNoContent();

    $this->postJson(route('v1.task-stages.store'), stagePayload(['name' => 'cancelled', 'order' => 1, 'color' => '#ef4444']))
        ->assertCreated()
        ->assertJsonPath('data.id', $stages['Cancelled']->id)
        ->assertJsonPath('data.order', 1)
        ->assertJsonPath('data.color', '#EF4444');
    expect(stageNames($this->companyA))->toBe(['cancelled', 'To Do', 'In Progress', 'Done'])
        ->and(DB::table('task_stages')->where('company_id', $this->companyA->id)->count())->toBe(4);

    $this->deleteJson(route('v1.task-stages.destroy', $stages['In Progress']))->assertNoContent();
    $this->putJson(route('v1.task-stages.update', $stages['To Do']), stagePayload(['name' => 'In Progress']))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['name' => 'A deleted stage uses this name. Add it as a new stage to restore it.']);
});

test('3c. updating while keeping its own name (or changing its case) passes; a sibling\'s name does not', function () {
    $stages = workflowFor($this->companyA);
    actAsStageUser($this->companyA);

    $this->putJson(route('v1.task-stages.update', $stages['To Do']), stagePayload(['name' => 'TO DO']))->assertOk()->assertJsonPath('data.name', 'TO DO');
    $this->putJson(route('v1.task-stages.update', $stages['To Do']), stagePayload(['name' => 'in progress']))
        ->assertUnprocessable()->assertJsonValidationErrors(['name' => 'A task stage with this name already exists.']);
});

test('4. an invalid color or a missing name → 422; the description is optional and capped', function (string $field, mixed $value, bool $valid) {
    workflowFor($this->companyA);
    actAsStageUser($this->companyA);

    $response = $this->postJson(route('v1.task-stages.store'), stagePayload([$field => $value]));

    $valid ? $response->assertCreated() : $response->assertUnprocessable()->assertJsonValidationErrors([$field]);
})->with([
    'color: a word' => ['color', 'blue', false],
    'color: three digits' => ['color', '#FFF', false],
    'color: not hex' => ['color', '#GGGGGG', false],
    'color: missing #' => ['color', '3B82F6', false],
    'color: empty' => ['color', '', false],
    'color: lowercase' => ['color', '#14b8a6', true],
    'name: missing' => ['name', '', false],
    'name: spaces' => ['name', '   ', false],
    'name: 256 chars' => ['name', str_repeat('a', 256), false],
    'description: empty' => ['description', '', true],
    'description: 1001 chars' => ['description', str_repeat('a', 1001), false],
    'status: unknown' => ['status', 'archived', false],
]);

// ───────────────────────────── the done stage

test('5. marking another stage as done moves the flag: exactly one done stage remains', function () {
    $stages = workflowFor($this->companyA);
    actAsStageUser($this->companyA);

    $this->putJson(route('v1.task-stages.update', $stages['Cancelled']), stagePayload(['name' => 'Cancelled', 'is_done_stage' => true]))
        ->assertOk()->assertJsonPath('data.is_done_stage', true);
    expect(collect(stageRows($this->companyA))->filter(fn ($r) => $r[2])->pluck(0)->all())->toBe(['Cancelled']);

    // …and on create: the new stage takes it.
    $this->postJson(route('v1.task-stages.store'), stagePayload(['name' => 'Shipped', 'is_done_stage' => true]))->assertCreated()->assertJsonPath('data.is_done_stage', true);
    expect(collect(stageRows($this->companyA))->filter(fn ($r) => $r[2])->pluck(0)->all())->toBe(['Shipped']);
});

test('5b. becoming the done stage makes an inactive stage active; asking for done + inactive is refused', function () {
    $stages = workflowFor($this->companyA);
    actAsStageUser($this->companyA);
    $this->patchJson(route('v1.task-stages.toggle-status', $stages['Cancelled']))->assertOk()->assertJsonPath('data.status', 'inactive');

    // No status sent: the stage becomes done and active.
    $this->putJson(route('v1.task-stages.update', $stages['Cancelled']), ['name' => 'Cancelled', 'color' => '#6B7280', 'is_done_stage' => true])
        ->assertOk()->assertJsonPath('data.is_done_stage', true)->assertJsonPath('data.status', 'active');

    $this->postJson(route('v1.task-stages.store'), stagePayload(['name' => 'Shipped', 'is_done_stage' => true, 'status' => 'inactive']))
        ->assertUnprocessable()->assertJsonValidationErrors(stageRuleError('The done stage must be active.'));
    expect(stageNames($this->companyA))->not->toContain('Shipped');
});

test('6. unsetting the only done stage → 422 with its own message', function () {
    $stages = workflowFor($this->companyA);
    actAsStageUser($this->companyA);

    $this->putJson(route('v1.task-stages.update', $stages['Done']), stagePayload(['name' => 'Done', 'is_done_stage' => false]))
        ->assertUnprocessable()->assertJsonValidationErrors(stageRuleError(STAGE_UNSET_DONE));
    expect(stageRows($this->companyA)[3])->toBe(['Done', 4, true, 'active']);
});

test('7. deleting the done stage → 422; deactivating it (toggle or edit) → 422 — each with its own message', function () {
    $stages = workflowFor($this->companyA);
    actAsStageUser($this->companyA);

    $this->deleteJson(route('v1.task-stages.destroy', $stages['Done']))
        ->assertUnprocessable()->assertJsonValidationErrors(stageRuleError(STAGE_DELETE_DONE));
    $this->patchJson(route('v1.task-stages.toggle-status', $stages['Done']))
        ->assertUnprocessable()->assertJsonValidationErrors(stageRuleError(STAGE_DEACTIVATE_DONE));
    $this->putJson(route('v1.task-stages.update', $stages['Done']), stagePayload(['name' => 'Done', 'is_done_stage' => true, 'status' => 'inactive']))
        ->assertUnprocessable()->assertJsonValidationErrors(stageRuleError('The done stage must be active.'));

    expect(stageRows($this->companyA)[3])->toBe(['Done', 4, true, 'active']);
});

test('8. deactivating the last active stage → 422 (toggle and edit)', function () {
    $stages = workflowFor($this->companyA);
    actAsStageUser($this->companyA);
    foreach (['To Do', 'In Progress', 'Cancelled'] as $name) {
        $this->patchJson(route('v1.task-stages.toggle-status', $stages[$name]))->assertOk()->assertJsonPath('data.status', 'inactive');
    }

    $this->patchJson(route('v1.task-stages.toggle-status', $stages['Done']))
        ->assertUnprocessable()->assertJsonValidationErrors(stageRuleError(STAGE_LAST_ACTIVE));
    $this->putJson(route('v1.task-stages.update', $stages['Done']), stagePayload(['name' => 'Done', 'status' => 'inactive']))
        ->assertUnprocessable()->assertJsonValidationErrors(['stage']);
    expect(collect(stageRows($this->companyA))->where(3, 'active')->pluck(0)->all())->toBe(['Done']);
});

// ───────────────────────────── delete + reorder

test('9. deleting a middle stage renumbers the rest to 1..n with no gaps', function () {
    $stages = workflowFor($this->companyA);
    actAsStageUser($this->companyA);

    $this->deleteJson(route('v1.task-stages.destroy', $stages['In Progress']))->assertNoContent();

    expect(stageRows($this->companyA))->toBe([['To Do', 1, false, 'active'], ['Cancelled', 2, false, 'active'], ['Done', 3, true, 'active']])
        ->and(DB::table('task_stages')->where('id', $stages['In Progress']->id)->value('deleted_at'))->not->toBeNull();
    $this->getJson(route('v1.task-stages.show', $stages['In Progress']))->assertNotFound();
});

test('10. reorder rewrites the sequence; a partial list, a duplicate, an unknown or a foreign id → 422 and nothing moves', function () {
    $stages = workflowFor($this->companyA);
    $theirs = workflowFor($this->companyB);
    actAsStageUser($this->companyA);
    [$todo, $progress, $cancelled, $done] = [$stages['To Do']->id, $stages['In Progress']->id, $stages['Cancelled']->id, $stages['Done']->id];

    $this->patchJson(route('v1.task-stages.reorder'), ['ids' => [$done, $todo, $cancelled, $progress]])
        ->assertOk()
        ->assertJsonPath('data.0.name', 'Done')->assertJsonPath('data.0.order', 1)
        ->assertJsonPath('data.3.name', 'In Progress')->assertJsonPath('data.3.order', 4);
    expect(stageNames($this->companyA))->toBe(['Done', 'To Do', 'Cancelled', 'In Progress']);

    foreach ([
        'partial' => [$done, $todo, $cancelled],
        'duplicate' => [$done, $todo, $cancelled, $cancelled],
        'unknown id' => [$done, $todo, $cancelled, 999999],
        'other company\'s id' => [$done, $todo, $cancelled, $theirs['To Do']->id],
        'extra foreign id' => [$done, $todo, $cancelled, $progress, $theirs['Done']->id],
        'empty' => [],
        'not ids' => ['a', 'b'],
    ] as $case => $ids) {
        $this->patchJson(route('v1.task-stages.reorder'), ['ids' => $ids])->assertUnprocessable();
        expect(stageNames($this->companyA))->toBe(['Done', 'To Do', 'Cancelled', 'In Progress'], $case);
    }
    expect(stageNames($this->companyB))->toBe(['To Do', 'In Progress', 'Cancelled', 'Done']);
});

// ───────────────────────────── tenant isolation

test('11. company A cannot read, update, delete, toggle or reorder company B\'s stages — 404s / 422, nothing changes', function () {
    $theirs = workflowFor($this->companyB);
    workflowFor($this->companyA);
    actAsStageUser($this->companyA);
    $stage = $theirs['In Progress'];

    $this->getJson(route('v1.task-stages.show', $stage))->assertNotFound();
    $this->putJson(route('v1.task-stages.update', $stage), stagePayload(['name' => 'Hijacked']))->assertNotFound();
    $this->patchJson(route('v1.task-stages.toggle-status', $stage))->assertNotFound();
    $this->deleteJson(route('v1.task-stages.destroy', $stage))->assertNotFound();
    // Reorder is not bound to one stage: B's ids are simply "not yours" → 422, B untouched.
    $this->patchJson(route('v1.task-stages.reorder'), ['ids' => $theirs->pluck('id')->reverse()->values()->all()])->assertUnprocessable();

    expect(stageRows($this->companyB))->toBe([
        ['To Do', 1, false, 'active'], ['In Progress', 2, false, 'active'], ['Cancelled', 3, false, 'active'], ['Done', 4, true, 'active'],
    ]);
});

test('12. company A\'s list and stats never include company B\'s stages, whatever the filters', function (array $query) {
    workflowFor($this->companyA);
    workflowFor($this->companyB);
    Tenancy::instance()->runAs($this->companyB, fn () => TaskStage::factory()->inactive()->create(['name' => 'B Only']));
    actAsStageUser($this->companyA);

    $ids = collect($this->getJson(route('v1.task-stages.index', $query))->assertOk()->json('data'))->pluck('id');
    $theirs = DB::table('task_stages')->where('company_id', $this->companyB->id)->pluck('id');

    expect($ids->intersect($theirs))->toBeEmpty();
    $this->getJson(route('v1.task-stages.stats'))->assertExactJson(['data' => [
        'total' => 4, 'active' => 4, 'inactive' => 0, 'done_stage' => ['id' => DB::table('task_stages')->where('company_id', $this->companyA->id)->where('is_done_stage', true)->value('id'), 'name' => 'Done'],
    ]]);
})->with([
    'no filters' => [[]],
    'search' => [['search' => 'o']],
    'inactive' => [['status' => 'inactive']],
    'date range' => [['created_from' => '2000-01-01', 'created_to' => '2999-12-31']],
]);

test('12b. the list is the whole workflow in order (no pagination); search and status narrow it', function () {
    $stages = workflowFor($this->companyA);
    Tenancy::instance()->runAs($this->companyA, fn () => TaskStage::factory()->count(12)->create());
    actAsStageUser($this->companyA);
    $this->patchJson(route('v1.task-stages.toggle-status', $stages['Cancelled']))->assertOk();
    $names = fn (array $q) => collect($this->getJson(route('v1.task-stages.index', $q))->assertOk()->json('data'))->pluck('name')->all();

    $all = $this->getJson(route('v1.task-stages.index'))->assertOk()->assertJsonMissingPath('meta');
    expect($all->json('data'))->toHaveCount(16)
        ->and(array_column($all->json('data'), 'order'))->toBe(range(1, 16))
        ->and($names(['search' => 'progr']))->toBe(['In Progress'])
        ->and($names(['status' => 'inactive']))->toBe(['Cancelled'])
        ->and($names(['search' => '50%_']))->toBe([]);
    $this->getJson(route('v1.task-stages.index', ['status' => 'archived']))->assertUnprocessable();
});

// ───────────────────────────── stats + counts

test('13. stats: total, active, inactive and the done stage\'s name', function () {
    $stages = workflowFor($this->companyA);
    actAsStageUser($this->companyA);
    $this->patchJson(route('v1.task-stages.toggle-status', $stages['Cancelled']))->assertOk();
    $this->putJson(route('v1.task-stages.update', $stages['In Progress']), stagePayload(['name' => 'In Progress', 'is_done_stage' => true]))->assertOk();

    $this->getJson(route('v1.task-stages.stats'))->assertOk()->assertExactJson(['data' => [
        'total' => 4, 'active' => 3, 'inactive' => 1, 'done_stage' => ['id' => $stages['In Progress']->id, 'name' => 'In Progress'],
    ]]);

    // A company with no stages: zeros and no done stage.
    actAsStageUser($this->companyB);
    $this->getJson(route('v1.task-stages.stats'))->assertExactJson(['data' => ['total' => 0, 'active' => 0, 'inactive' => 0, 'done_stage' => null]]);
});

test('14. tasks_count is 0 on every stage — list, show, create and reorder (TODO(tasks): flip when the Tasks module lands)', function () {
    $stages = workflowFor($this->companyA);
    actAsStageUser($this->companyA);

    expect(collect($this->getJson(route('v1.task-stages.index'))->json('data'))->pluck('tasks_count')->all())->toBe([0, 0, 0, 0]);
    $this->getJson(route('v1.task-stages.show', $stages['Done']))->assertJsonPath('data.tasks_count', 0);
    $this->postJson(route('v1.task-stages.store'), stagePayload())->assertJsonPath('data.tasks_count', 0);
    expect(collect($this->patchJson(route('v1.task-stages.reorder'), ['ids' => array_reverse(collect(stageRows($this->companyA))->map(fn ($r) => DB::table('task_stages')->where('company_id', $this->companyA->id)->where('name', $r[0])->value('id'))->all())])->json('data'))->pluck('tasks_count')->unique()->all())->toBe([0]);
});

// ───────────────────────────── new companies get the defaults

const DEFAULT_STAGE_ROWS = [
    ['To Do', 1, false, 'active'], ['In Progress', 2, false, 'active'], ['Cancelled', 3, false, 'active'], ['Done', 4, true, 'active'],
];

test('15. a company created by a super admin has exactly the four defaults, in order, Done the done stage — and the five categories', function () {
    actAsStageUser(User::factory()->superAdmin()->create());

    $id = $this->postJson(route('v1.admin.companies.store'), [
        'name' => 'New Co', 'email' => 'new@co.test', 'enable_login' => true, 'password' => 'password', 'password_confirmation' => 'password',
    ])->assertCreated()->json('data.id');
    $company = User::query()->findOrFail($id);

    expect(stageRows($company))->toBe(DEFAULT_STAGE_ROWS)
        ->and(DB::table('task_stages')->where('company_id', $id)->orderBy('order')->pluck('color')->all())->toBe(['#6B7280', '#3B82F6', '#6B7280', '#10B981'])
        ->and(DB::table('expense_categories')->where('company_id', $id)->count())->toBe(5);

    actAsStageUser($company);
    $this->getJson(route('v1.task-stages.stats'))->assertJsonPath('data.done_stage.name', 'Done')->assertJsonPath('data.total', 4);
});

test('15b. a company that registers itself gets the same four stages', function () {
    $this->postJson(route('v1.auth.register'), [
        'name' => 'Self Signup', 'email' => 'self@signup.test', 'password' => 'password', 'password_confirmation' => 'password',
    ])->assertCreated();

    expect(stageRows(User::query()->where('email', 'self@signup.test')->firstOrFail()))->toBe(DEFAULT_STAGE_ROWS);
});

test('15c. setting a company up again never duplicates stages, never brings back a deleted one, and keeps one done stage', function () {
    $setup = app(CompanySetupService::class);
    $company = Company::query()->findOrFail($this->companyA->id);

    expect($setup->seedTaskStages($company))->toBe(4)
        ->and($setup->seedTaskStages($company))->toBe(0);
    $setup->setUp($company);
    expect(stageRows($this->companyA))->toBe(DEFAULT_STAGE_ROWS);

    actAsStageUser($this->companyA);
    $cancelled = TaskStage::query()->where('name', 'Cancelled')->firstOrFail();
    $this->deleteJson(route('v1.task-stages.destroy', $cancelled))->assertNoContent();

    expect($setup->seedTaskStages($company))->toBe(0)
        ->and(stageNames($this->companyA))->toBe(['To Do', 'In Progress', 'Done'])
        ->and(stageRows($this->companyB))->toBe([]);
});

test('15d. a company that already has its own stages gets the missing defaults after them, with one done stage', function () {
    Tenancy::instance()->runAs($this->companyA, fn () => TaskStage::factory()->create(['name' => 'Backlog']));
    app(CompanySetupService::class)->seedTaskStages(Company::query()->findOrFail($this->companyA->id));

    expect(stageRows($this->companyA))->toBe([
        ['Backlog', 1, false, 'active'], ['To Do', 2, false, 'active'], ['In Progress', 3, false, 'active'], ['Cancelled', 4, false, 'active'], ['Done', 5, true, 'active'],
    ]);
});

// ───────────────────────────── access

test('16. a guest gets 401 and a super admin 403 on every task-stage route; nothing changes', function (string $method, string $route, bool $bound) {
    $stage = workflowFor($this->companyA)['In Progress'];
    $url = route($route, $bound ? $stage : []);
    $body = $route === 'v1.task-stages.reorder' ? ['ids' => [$stage->id]] : stagePayload();

    $this->json($method, $url, $body)->assertUnauthorized();

    // role:company runs before route-model binding (bootstrap/app.php priority list), so the
    // {stage} routes answer 403 too instead of resolving the stage first.
    actAsStageUser(User::factory()->superAdmin()->create());
    $this->json($method, $url, $body)->assertForbidden()->assertJsonStructure(['message']);

    expect(stageRows($this->companyA))->toBe(DEFAULT_STAGE_ROWS)
        ->and(DB::table('task_stages')->count())->toBe(4);
})->with([
    'index' => ['GET', 'v1.task-stages.index', false],
    'stats' => ['GET', 'v1.task-stages.stats', false],
    'store' => ['POST', 'v1.task-stages.store', false],
    'show' => ['GET', 'v1.task-stages.show', true],
    'update' => ['PUT', 'v1.task-stages.update', true],
    'destroy' => ['DELETE', 'v1.task-stages.destroy', true],
    'toggle' => ['PATCH', 'v1.task-stages.toggle-status', true],
    'reorder' => ['PATCH', 'v1.task-stages.reorder', false],
]);

test('the resource exposes the form fields, order, the done flag and tasks_count — never the owner', function () {
    $stage = workflowFor($this->companyA)['Done'];
    actAsStageUser($this->companyA);

    $data = $this->getJson(route('v1.task-stages.show', $stage))->assertOk()->json('data');

    expect(array_keys($data))->toBe(['id', 'name', 'description', 'color', 'order', 'is_done_stage', 'status', 'status_label', 'tasks_count', 'created_at', 'updated_at'])
        ->and($data['is_done_stage'])->toBeTrue()
        ->and($data['order'])->toBe(4);
});

test('TaskStage::tasks() is an honest stub until the Tasks module exists', function () {
    $stage = workflowFor($this->companyA)['Done'];

    expect(fn () => $stage->tasks())->toThrow(LogicException::class, 'the tasks table does not exist');
});
