<?php

use App\Models\Plan;
use App\Models\Project;
use App\Models\Task;
use App\Models\TaskChecklistItem;
use App\Models\TaskStage;
use App\Models\User;
use App\Support\Tenancy\Tenancy;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/* A task's checklist (the Checklist tab) — test 10: CRUD and reorder scoped to the company's own
   task, independent of the task's progress (business rule 9). */

beforeEach(function () {
    $plan = Plan::factory()->create(['max_projects' => Plan::UNLIMITED]);
    $this->companyA = User::factory()->company()->create();
    $this->companyB = User::factory()->company()->create();
    foreach ([$this->companyA, $this->companyB] as $company) {
        $company->forceFill(['plan_id' => $plan->id])->save();
    }
    $this->taskA = checklistTaskFor($this->companyA, 'A task');
    $this->taskB = checklistTaskFor($this->companyB, 'B task');
});

function checklistTaskFor(User $company, string $title): Task
{
    return Tenancy::instance()->runAs($company, fn () => Task::factory()->create([
        'title' => $title,
        'progress' => 40,
        'project_id' => Project::factory(),
        'task_stage_id' => TaskStage::factory(),
    ]));
}

function actAsChecklistUser(User $user): void
{
    test()->flushSession();
    Auth::forgetGuards();
    test()->actingAs($user, 'web');
}

/** [title => position] of a task's checklist, in order. */
function checklistOf(Task $task): array
{
    return DB::table('task_checklist_items')->where('task_id', $task->id)->orderBy('position')->pluck('position', 'title')->all();
}

test('10a. add (at the end), list in order, rename, tick — and the task\'s progress never changes', function () {
    actAsChecklistUser($this->companyA);

    $ids = [];
    foreach (['Outline', 'Draft', 'Review'] as $title) {
        $ids[$title] = $this->postJson(route('v1.tasks.checklist-items.store', $this->taskA), ['title' => $title, 'company_id' => $this->companyB->id, 'task_id' => $this->taskB->id])
            ->assertCreated()->assertJsonPath('data.is_completed', false)->json('data.id');
    }
    expect(checklistOf($this->taskA))->toBe(['Outline' => 1, 'Draft' => 2, 'Review' => 3])
        ->and(DB::table('task_checklist_items')->where('id', $ids['Draft'])->value('company_id'))->toBe($this->companyA->id);

    $this->getJson(route('v1.tasks.checklist-items.index', $this->taskA))->assertOk()->assertJsonCount(3, 'data')->assertJsonPath('data.0.title', 'Outline');
    $this->putJson(route('v1.task-checklist-items.update', $ids['Draft']), ['is_completed' => true])->assertOk()->assertJsonPath('data.is_completed', true)->assertJsonPath('data.title', 'Draft');
    $this->putJson(route('v1.task-checklist-items.update', $ids['Draft']), ['title' => 'First draft'])->assertOk()->assertJsonPath('data.title', 'First draft')->assertJsonPath('data.is_completed', true);
    $this->putJson(route('v1.task-checklist-items.update', $ids['Draft']), ['title' => ''])->assertUnprocessable()->assertJsonValidationErrors(['title']);

    $this->getJson(route('v1.tasks.show', $this->taskA))->assertJsonPath('data.checklist_summary', ['total' => 3, 'completed' => 1])->assertJsonPath('data.progress', 40);
});

test('10b. reorder writes the new order; a list that isn\'t exactly the task\'s items is a 422; delete closes the gap', function () {
    $items = Tenancy::instance()->runAs($this->companyA, fn () => collect(['One', 'Two', 'Three'])->map(fn ($t) => TaskChecklistItem::factory()->for($this->taskA)->create(['title' => $t])));
    actAsChecklistUser($this->companyA);

    $this->patchJson(route('v1.tasks.checklist-items.reorder', $this->taskA), ['ids' => [$items[2]->id, $items[0]->id, $items[1]->id]])
        ->assertOk()->assertJsonPath('data.0.title', 'Three')->assertJsonPath('data.2.title', 'Two');
    expect(checklistOf($this->taskA))->toBe(['Three' => 1, 'One' => 2, 'Two' => 3]);

    foreach ([[$items[0]->id, $items[1]->id], [...$items->pluck('id')->all(), 999999], [$items[0]->id, $items[0]->id, $items[1]->id]] as $bad) {
        $this->patchJson(route('v1.tasks.checklist-items.reorder', $this->taskA), ['ids' => $bad])->assertUnprocessable();
    }
    expect(checklistOf($this->taskA))->toBe(['Three' => 1, 'One' => 2, 'Two' => 3]);

    $this->deleteJson(route('v1.task-checklist-items.destroy', $items[0]))->assertNoContent();
    expect(checklistOf($this->taskA))->toBe(['Three' => 1, 'Two' => 2]);
});

test('10c. company A cannot list, add, reorder, edit or delete company B\'s checklist — all 404, nothing changes', function () {
    $theirs = Tenancy::instance()->runAs($this->companyB, fn () => TaskChecklistItem::factory()->for($this->taskB)->create(['title' => 'B item']));
    $mine = Tenancy::instance()->runAs($this->companyA, fn () => TaskChecklistItem::factory()->for($this->taskA)->create(['title' => 'A item']));
    actAsChecklistUser($this->companyA);

    $this->getJson(route('v1.tasks.checklist-items.index', $this->taskB))->assertNotFound();
    $this->postJson(route('v1.tasks.checklist-items.store', $this->taskB), ['title' => 'Intruder'])->assertNotFound();
    $this->patchJson(route('v1.tasks.checklist-items.reorder', $this->taskB), ['ids' => [$theirs->id]])->assertNotFound();
    $this->putJson(route('v1.task-checklist-items.update', $theirs), ['is_completed' => true])->assertNotFound();
    $this->deleteJson(route('v1.task-checklist-items.destroy', $theirs))->assertNotFound();
    // B's item id inside A's reorder list is not A's item → 422, and B's list is untouched.
    $this->patchJson(route('v1.tasks.checklist-items.reorder', $this->taskA), ['ids' => [$mine->id, $theirs->id]])->assertUnprocessable();

    expect(DB::table('task_checklist_items')->where('id', $theirs->id)->first())->title->toBe('B item')
        ->and(DB::table('task_checklist_items')->where('id', $theirs->id)->value('is_completed'))->toBe(0)
        ->and(DB::table('task_checklist_items')->where('task_id', $this->taskB->id)->count())->toBe(1);
});

test('a guest gets 401 and a super admin 403 on every checklist route', function (string $method, string $route, string $bound) {
    $item = Tenancy::instance()->runAs($this->companyA, fn () => TaskChecklistItem::factory()->for($this->taskA)->create());
    $url = route($route, $bound === 'task' ? $this->taskA : $item);

    $this->json($method, $url, ['title' => 'x', 'ids' => [$item->id]])->assertUnauthorized();
    actAsChecklistUser(User::factory()->superAdmin()->create());
    $this->json($method, $url, ['title' => 'x', 'ids' => [$item->id]])->assertForbidden();

    expect(DB::table('task_checklist_items')->count())->toBe(1);
})->with([
    'index' => ['GET', 'v1.tasks.checklist-items.index', 'task'],
    'store' => ['POST', 'v1.tasks.checklist-items.store', 'task'],
    'reorder' => ['PATCH', 'v1.tasks.checklist-items.reorder', 'task'],
    'update' => ['PUT', 'v1.task-checklist-items.update', 'item'],
    'destroy' => ['DELETE', 'v1.task-checklist-items.destroy', 'item'],
]);
