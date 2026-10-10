<?php

use App\Enums\ExpenseCategoryStatus;
use App\Models\Client;
use App\Models\Expense;
use App\Models\ExpenseCategory;
use App\Models\Media;
use App\Models\Milestone;
use App\Models\Plan;
use App\Models\Project;
use App\Models\ProjectFile;
use App\Models\ProjectItem;
use App\Models\ProjectNote;
use App\Models\User;
use App\Support\Tenancy\Tenancy;
use Illuminate\Support\Facades\Auth;

/* The Items, Notes and Expenses tabs (PRD §6.3) — always under the company's own project — and
   the two delete guards those tables now enable (Phase 0 decision 5). */

beforeEach(function () {
    $plan = Plan::factory()->create(['max_projects' => Plan::UNLIMITED]);
    $this->companyA = User::factory()->company()->create(['name' => 'Company A']);
    $this->companyB = User::factory()->company()->create(['name' => 'Company B']);
    foreach ([$this->companyA, $this->companyB] as $company) {
        $company->forceFill(['plan_id' => $plan->id])->save();
    }
    $this->projectA = Tenancy::instance()->runAs($this->companyA, fn () => Project::factory()->create(['name' => 'A Project']));
    $this->projectB = Tenancy::instance()->runAs($this->companyB, fn () => Project::factory()->create(['name' => 'B Project']));
    $this->travelA = Tenancy::instance()->runAs($this->companyA, fn () => ExpenseCategory::factory()->create(['name' => 'Travel', 'color' => '#3B82F6']));
    $this->travelB = Tenancy::instance()->runAs($this->companyB, fn () => ExpenseCategory::factory()->create(['name' => 'Travel', 'color' => '#3B82F6']));
});

function actAsTabUser(User $user): void
{
    test()->flushSession();
    Auth::forgetGuards();
    test()->actingAs($user, 'web');
}

// ───────────────────────────── items

test('items: create under the company\'s project (company and project from the route), list, update, delete', function () {
    actAsTabUser($this->companyA);

    $id = $this->postJson(route('v1.projects.items.store', $this->projectA), ['name' => 'Logo Design', 'description' => 'Professional logo design service', 'default_price' => '500', 'unit' => 'hours', 'company_id' => $this->companyB->id, 'project_id' => $this->projectB->id])
        ->assertCreated()
        ->assertJsonPath('data.name', 'Logo Design')
        ->assertJsonPath('data.default_price', '500.00')
        ->assertJsonPath('data.unit', 'hours')
        ->assertJsonPath('data.unit_label', 'hours')
        ->assertJsonPath('data.status', 'active')
        ->assertJsonPath('data.status_label', 'Active')
        ->json('data.id');
    $row = DB::table('project_items')->where('id', $id)->first();
    expect([$row->company_id, $row->project_id])->toBe([$this->companyA->id, $this->projectA->id]);

    $this->getJson(route('v1.projects.items.index', $this->projectA))->assertOk()->assertJsonCount(1, 'data');
    $this->putJson(route('v1.project-items.update', $id), ['name' => 'Logo Design Pro', 'default_price' => '10291.00', 'unit' => 'package'])
        ->assertOk()->assertJsonPath('data.default_price', '10291.00')->assertJsonPath('data.unit', 'package');
    $this->deleteJson(route('v1.project-items.destroy', $id))->assertNoContent();
    expect(DB::table('project_items')->where('id', $id)->value('deleted_at'))->not->toBeNull();
    $this->getJson(route('v1.projects.items.index', $this->projectA))->assertJsonCount(0, 'data');
});

test('item rules: name, price ≥ 0 (2 decimals) and a known unit are required', function (array $payload, string $field) {
    actAsTabUser($this->companyA);

    $this->postJson(route('v1.projects.items.store', $this->projectA), [...['name' => 'Item', 'default_price' => '10', 'unit' => 'hours'], ...$payload])
        ->assertUnprocessable()->assertJsonValidationErrors([$field]);
})->with([
    'name missing' => [['name' => ''], 'name'],
    'price missing' => [['default_price' => ''], 'default_price'],
    'price negative' => [['default_price' => '-0.01'], 'default_price'],
    'price 3 decimals' => [['default_price' => '1.001'], 'default_price'],
    'unit missing' => [['unit' => ''], 'unit'],
    'unit unknown' => [['unit' => 'week'], 'unit'],
]);

// ───────────────────────────── notes

test('notes: the author is the signed-in user (never the request), shown by name; show, update keeps the author, delete', function () {
    actAsTabUser($this->companyA);

    $id = $this->postJson(route('v1.projects.notes.store', $this->projectA), ['title' => 'Important project update: Budget approved', 'content' => 'The board approved the budget.', 'created_by' => $this->companyB->id])
        ->assertCreated()
        ->assertJsonPath('data.author.name', 'Company A')
        ->assertJsonPath('data.content', 'The board approved the budget.')
        ->json('data.id');
    expect(DB::table('project_notes')->where('id', $id)->value('created_by'))->toBe($this->companyA->id);

    $this->getJson(route('v1.project-notes.show', $id))->assertOk()->assertJsonPath('data.title', 'Important project update: Budget approved');
    $this->putJson(route('v1.project-notes.update', $id), ['title' => 'Edited', 'content' => 'New content'])
        ->assertOk()->assertJsonPath('data.title', 'Edited')->assertJsonPath('data.author.name', 'Company A');
    $this->getJson(route('v1.projects.notes.index', $this->projectA))->assertJsonPath('data.0.author.name', 'Company A');
    $this->deleteJson(route('v1.project-notes.destroy', $id))->assertNoContent();
    $this->getJson(route('v1.project-notes.show', $id))->assertNotFound();
});

test('note rules: title and content are required', function () {
    actAsTabUser($this->companyA);

    $this->postJson(route('v1.projects.notes.store', $this->projectA), ['title' => '', 'content' => '  '])
        ->assertUnprocessable()->assertJsonValidationErrors(['title' => 'The title is required.', 'content' => 'The content is required.']);
});

// ───────────────────────────── expenses

test('expenses: create, list with the category (name + colour), update, delete; stats match the exact sum', function () {
    actAsTabUser($this->companyA);

    foreach (['1458.00', '1936.00', '321.00', '1336.00', '150.00', '70.00', '950.00'] as $i => $amount) {
        $this->postJson(route('v1.projects.expenses.store', $this->projectA), ['title' => "Expense $i", 'amount' => $amount, 'expense_date' => '2026-03-29', 'expense_category_id' => $this->travelA->id])->assertCreated();
    }
    $this->getJson(route('v1.projects.expenses.stats', $this->projectA))->assertExactJson(['data' => ['count' => 7, 'total' => '6221.00']]);

    $first = $this->getJson(route('v1.projects.expenses.index', $this->projectA))
        ->assertJsonCount(7, 'data')
        ->assertJsonPath('data.0.category', ['id' => $this->travelA->id, 'name' => 'Travel', 'color' => '#3B82F6'])
        ->json('data.0');
    $this->putJson(route('v1.expenses.update', $first['id']), ['title' => 'Edited', 'amount' => '0.10', 'expense_date' => '2026-04-01', 'expense_category_id' => $this->travelA->id])
        ->assertOk()->assertJsonPath('data.amount', '0.10')->assertJsonPath('data.expense_date', '2026-04-01');
    $this->deleteJson(route('v1.expenses.destroy', $first['id']))->assertNoContent();

    $stats = $this->getJson(route('v1.projects.expenses.stats', $this->projectA))->json('data');
    expect($stats['count'])->toBe(6)
        ->and($stats['total'])->toBe(bcsub('6221.00', $first['amount'], 2));
    // …and the project's figures move with them.
    $this->getJson(route('v1.projects.show', $this->projectA))->assertJsonPath('data.figures.budget.spent', $stats['total'])->assertJsonPath('data.counts.expenses', 6);
});

test('expense rules: another company\'s or an inactive category → 422; negative amount → 422; required fields', function () {
    $inactive = Tenancy::instance()->runAs($this->companyA, fn () => ExpenseCategory::factory()->create(['status' => ExpenseCategoryStatus::Inactive]));
    actAsTabUser($this->companyA);
    $post = fn (array $overrides) => $this->postJson(route('v1.projects.expenses.store', $this->projectA), [...['title' => 'Training', 'amount' => '10', 'expense_date' => '2026-03-29', 'expense_category_id' => $this->travelA->id], ...$overrides]);

    $post(['expense_category_id' => $this->travelB->id])->assertUnprocessable()->assertJsonValidationErrors(['expense_category_id' => 'Select one of your active categories.']);
    $post(['expense_category_id' => $inactive->id])->assertUnprocessable()->assertJsonValidationErrors(['expense_category_id']);
    $post(['amount' => '-1'])->assertUnprocessable()->assertJsonValidationErrors(['amount' => 'The amount can\'t be negative.']);
    $post(['amount' => '1.234'])->assertUnprocessable()->assertJsonValidationErrors(['amount']);
    $post(['title' => '', 'amount' => '', 'expense_date' => '', 'expense_category_id' => ''])->assertUnprocessable()->assertJsonValidationErrors(['title', 'amount', 'expense_date', 'expense_category_id']);
    $post(['expense_date' => '29/03/2026'])->assertUnprocessable()->assertJsonValidationErrors(['expense_date']);
    $post(['amount' => '0'])->assertCreated();
    expect(DB::table('expenses')->count())->toBe(1);
});

test('an expense edit may keep a category deactivated since, but not move to another inactive one', function () {
    $expense = Tenancy::instance()->runAs($this->companyA, fn () => Expense::factory()->for($this->projectA)->create(['expense_category_id' => $this->travelA->id]));
    $other = Tenancy::instance()->runAs($this->companyA, fn () => ExpenseCategory::factory()->create(['status' => ExpenseCategoryStatus::Inactive]));
    DB::table('expense_categories')->where('id', $this->travelA->id)->update(['status' => 'inactive']);
    actAsTabUser($this->companyA);

    $this->putJson(route('v1.expenses.update', $expense), ['title' => 'Kept', 'amount' => '5', 'expense_date' => '2026-03-29', 'expense_category_id' => $this->travelA->id])->assertOk();
    $this->putJson(route('v1.expenses.update', $expense), ['title' => 'Moved', 'amount' => '5', 'expense_date' => '2026-03-29', 'expense_category_id' => $other->id])
        ->assertUnprocessable()->assertJsonValidationErrors(['expense_category_id']);
});

// ───────────────────────────── tenant isolation

test('every tab is tenant-scoped: B\'s project, item, note and expense are 404 for A; A\'s lists never show B\'s rows', function () {
    [$item, $note, $expense] = Tenancy::instance()->runAs($this->companyB, fn () => [
        ProjectItem::factory()->for($this->projectB)->create(['name' => 'B Item']),
        ProjectNote::factory()->for($this->projectB)->create(['title' => 'B Note']),
        Expense::factory()->for($this->projectB)->create(['expense_category_id' => $this->travelB->id, 'title' => 'B Expense']),
    ]);
    Tenancy::instance()->runAs($this->companyA, function () {
        ProjectItem::factory()->for($this->projectA)->create();
        Expense::factory()->for($this->projectA)->create(['expense_category_id' => $this->travelA->id]);
    });
    actAsTabUser($this->companyA);

    foreach (['items', 'notes', 'expenses'] as $tab) {
        $this->getJson(route("v1.projects.$tab.index", $this->projectB))->assertNotFound();
        $this->postJson(route("v1.projects.$tab.store", $this->projectB), ['title' => 'x', 'name' => 'x', 'content' => 'x', 'default_price' => '1', 'unit' => 'hours', 'amount' => '1', 'expense_date' => '2026-01-01', 'expense_category_id' => $this->travelA->id])->assertNotFound();
    }
    $this->getJson(route('v1.projects.expenses.stats', $this->projectB))->assertNotFound();
    $this->putJson(route('v1.project-items.update', $item), ['name' => 'Hijacked', 'default_price' => '1', 'unit' => 'hours'])->assertNotFound();
    $this->deleteJson(route('v1.project-items.destroy', $item))->assertNotFound();
    $this->getJson(route('v1.project-notes.show', $note))->assertNotFound();
    $this->putJson(route('v1.project-notes.update', $note), ['title' => 'Hijacked', 'content' => 'x'])->assertNotFound();
    $this->deleteJson(route('v1.project-notes.destroy', $note))->assertNotFound();
    $this->putJson(route('v1.expenses.update', $expense), ['title' => 'Hijacked', 'amount' => '1', 'expense_date' => '2026-01-01', 'expense_category_id' => $this->travelA->id])->assertNotFound();
    $this->deleteJson(route('v1.expenses.destroy', $expense))->assertNotFound();

    expect(collect($this->getJson(route('v1.projects.items.index', $this->projectA))->json('data'))->pluck('name'))->not->toContain('B Item')
        ->and(collect($this->getJson(route('v1.projects.expenses.index', $this->projectA))->json('data'))->pluck('title'))->not->toContain('B Expense')
        ->and(DB::table('project_items')->where('id', $item->id)->value('name'))->toBe('B Item')
        ->and(DB::table('project_notes')->where('id', $note->id)->whereNull('deleted_at')->exists())->toBeTrue()
        ->and(DB::table('expenses')->where('id', $expense->id)->value('title'))->toBe('B Expense');
});

// ───────────────────────────── project delete cascade (decision 4)

test('deleting a project soft-deletes its milestones, items, notes and expenses and drops its file links; media stays', function () {
    [$media, $kept] = Tenancy::instance()->runAs($this->companyA, function () {
        Milestone::factory()->for($this->projectA)->create();
        ProjectItem::factory()->for($this->projectA)->create();
        ProjectNote::factory()->for($this->projectA)->create();
        Expense::factory()->for($this->projectA)->create(['expense_category_id' => $this->travelA->id]);
        $media = Media::factory()->create();
        $link = new ProjectFile;
        $link->forceFill(['project_id' => $this->projectA->id, 'media_id' => $media->id])->save();
        $kept = Project::factory()->create();
        ProjectItem::factory()->for($kept)->create();

        return [$media, $kept];
    });
    actAsTabUser($this->companyA);

    $this->deleteJson(route('v1.projects.destroy', $this->projectA))->assertNoContent();

    foreach (['milestones', 'project_items', 'project_notes', 'expenses'] as $table) {
        expect(DB::table($table)->where('project_id', $this->projectA->id)->whereNull('deleted_at')->count())->toBe(0, $table)
            ->and(DB::table($table)->where('project_id', $this->projectA->id)->count())->toBe(1, $table);
    }
    expect(DB::table('project_files')->where('project_id', $this->projectA->id)->count())->toBe(0)
        ->and(DB::table('media')->where('id', $media->id)->whereNull('deleted_at')->exists())->toBeTrue()
        ->and(DB::table('project_items')->where('project_id', $kept->id)->whereNull('deleted_at')->count())->toBe(1);
    // The expense no longer blocks deleting its category.
    $this->deleteJson(route('v1.expense-categories.destroy', $this->travelA))->assertNoContent();
});

// ───────────────────────────── delete guards (decision 5)

test('a client with projects can\'t be deleted; once its projects are gone it can', function () {
    $client = Tenancy::instance()->runAs($this->companyA, fn () => Client::factory()->create());
    $project = Tenancy::instance()->runAs($this->companyA, fn () => Project::factory()->create(['client_id' => $client->id]));
    actAsTabUser($this->companyA);

    $this->deleteJson(route('v1.clients.destroy', $client))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['client' => 'This client has projects. Delete or move them to another client first.']);
    expect(DB::table('clients')->where('id', $client->id)->value('deleted_at'))->toBeNull();

    $this->deleteJson(route('v1.projects.destroy', $project))->assertNoContent();
    $this->deleteJson(route('v1.clients.destroy', $client))->assertNoContent();
});

test('an expense category used by expenses can\'t be deleted; once those expenses are gone it can', function () {
    $expense = Tenancy::instance()->runAs($this->companyA, fn () => Expense::factory()->for($this->projectA)->create(['expense_category_id' => $this->travelA->id]));
    actAsTabUser($this->companyA);

    $this->deleteJson(route('v1.expense-categories.destroy', $this->travelA))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['category' => 'This category is used by expenses. Deactivate it instead.']);
    $this->patchJson(route('v1.expense-categories.toggle-status', $this->travelA))->assertOk()->assertJsonPath('data.status', 'inactive');

    $this->deleteJson(route('v1.expenses.destroy', $expense))->assertNoContent();
    $this->deleteJson(route('v1.expense-categories.destroy', $this->travelA))->assertNoContent();
});

// ───────────────────────────── access

test('a guest gets 401 and a super admin 403 on every tab route', function (string $method, string $route, string $bound) {
    [$item, $note, $expense] = Tenancy::instance()->runAs($this->companyA, fn () => [
        ProjectItem::factory()->for($this->projectA)->create(),
        ProjectNote::factory()->for($this->projectA)->create(),
        Expense::factory()->for($this->projectA)->create(['expense_category_id' => $this->travelA->id]),
    ]);
    $url = route($route, match ($bound) {
        'project' => $this->projectA, 'item' => $item, 'note' => $note, 'expense' => $expense
    });

    $this->json($method, $url, ['title' => 'x'])->assertUnauthorized();
    actAsTabUser(User::factory()->superAdmin()->create());
    $this->json($method, $url, ['title' => 'x'])->assertForbidden();

    expect(DB::table('project_items')->whereNull('deleted_at')->count())->toBe(1)
        ->and(DB::table('project_notes')->whereNull('deleted_at')->count())->toBe(1)
        ->and(DB::table('expenses')->whereNull('deleted_at')->count())->toBe(1);
})->with([
    'items index' => ['GET', 'v1.projects.items.index', 'project'],
    'items store' => ['POST', 'v1.projects.items.store', 'project'],
    'item update' => ['PUT', 'v1.project-items.update', 'item'],
    'item destroy' => ['DELETE', 'v1.project-items.destroy', 'item'],
    'notes index' => ['GET', 'v1.projects.notes.index', 'project'],
    'notes store' => ['POST', 'v1.projects.notes.store', 'project'],
    'note show' => ['GET', 'v1.project-notes.show', 'note'],
    'note update' => ['PUT', 'v1.project-notes.update', 'note'],
    'note destroy' => ['DELETE', 'v1.project-notes.destroy', 'note'],
    'expenses index' => ['GET', 'v1.projects.expenses.index', 'project'],
    'expenses stats' => ['GET', 'v1.projects.expenses.stats', 'project'],
    'expenses store' => ['POST', 'v1.projects.expenses.store', 'project'],
    'expense update' => ['PUT', 'v1.expenses.update', 'expense'],
    'expense destroy' => ['DELETE', 'v1.expenses.destroy', 'expense'],
]);
