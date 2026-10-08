<?php

use App\Enums\ExpenseCategoryStatus;
use App\Models\Company;
use App\Models\ExpenseCategory;
use App\Models\User;
use App\Services\CompanySetupService;
use App\Support\Tenancy\Tenancy;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;

/* /api/v1/expense-categories — tenant-scoped (PRD §6.14, CLAUDE.md §7), plus the five defaults
   CompanySetupService gives every new company (CLAUDE.md §13). */

beforeEach(function () {
    $this->companyA = User::factory()->company()->create(['name' => 'Company A']);
    $this->companyB = User::factory()->company()->create(['name' => 'Company B']);
});

/** A valid Add Category payload. */
function categoryPayload(array $overrides = []): array
{
    return [
        'name' => 'Equipment',
        'description' => 'Hardware and tools',
        'color' => '#3B82F6',
        'status' => 'active',
        ...$overrides,
    ];
}

/** Categories for a company, created the way seeders do. */
function categoriesFor(User $company, int $count = 1, array $attributes = []): Collection
{
    return Tenancy::instance()->runAs($company, fn () => ExpenseCategory::factory()->count($count)->create($attributes));
}

/**
 * Switch the signed-in user (Sanctum caches the user per guard). The session is flushed too:
 * Sanctum's AuthenticateSession keeps the previous user's password hash in it, and a user with
 * a different hash (one created through the API, not the factory) would be signed out.
 */
function actAsCategoryUser(User $user): void
{
    test()->flushSession();
    Auth::forgetGuards();
    test()->actingAs($user, 'web');
}

/** A company's category rows straight from the table (no tenant scope involved). */
function categoryRows(User $company): Collection
{
    return DB::table('expense_categories')->where('company_id', $company->id)->orderBy('id')->get();
}

// ───────────────────────────── create

test('1. create → 201 under the authenticated company; the color is stored uppercase', function () {
    actAsCategoryUser($this->companyA);

    $response = $this->postJson(route('v1.expense-categories.store'), categoryPayload(['name' => '  Equipment ', 'color' => '#10b77f']))
        ->assertCreated()
        ->assertJsonPath('data.name', 'Equipment')
        ->assertJsonPath('data.color', '#10B77F')
        ->assertJsonPath('data.status', 'active')
        ->assertJsonPath('data.status_label', 'Active')
        ->assertJsonMissingPath('data.company_id');

    $row = DB::table('expense_categories')->where('id', $response->json('data.id'))->first();
    expect($row->company_id)->toBe($this->companyA->id)
        ->and($row->color)->toBe('#10B77F');
});

test('2. a company_id (or id) in the payload is ignored — stored under the authenticated company', function () {
    actAsCategoryUser($this->companyA);

    $id = $this->postJson(route('v1.expense-categories.store'), categoryPayload(['company_id' => $this->companyB->id, 'id' => 999]))
        ->assertCreated()
        ->json('data.id');

    expect(DB::table('expense_categories')->where('id', $id)->value('company_id'))->toBe($this->companyA->id)
        ->and($id)->not->toBe(999);
});

test('3. the name is unique within a company, in any case; another company may use the same name', function (string $duplicate) {
    categoriesFor($this->companyA, 1, ['name' => 'Travel']);

    actAsCategoryUser($this->companyA);
    $this->postJson(route('v1.expense-categories.store'), categoryPayload(['name' => $duplicate]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['name' => 'An expense category with this name already exists.']);

    actAsCategoryUser($this->companyB);
    $this->postJson(route('v1.expense-categories.store'), categoryPayload(['name' => 'Travel']))->assertCreated();

    expect(DB::table('expense_categories')->where('name', 'Travel')->count())->toBe(2);
})->with(['exact' => 'Travel', 'lower case' => 'travel', 'upper case' => 'TRAVEL', 'padded' => '  Travel  ']);

test('3b. adding the name of a deleted category restores that row with the new values (no duplicate, no 500)', function () {
    $old = categoriesFor($this->companyA, 1, ['name' => 'Travel', 'color' => '#3B82F6', 'status' => ExpenseCategoryStatus::Inactive])->first();
    actAsCategoryUser($this->companyA);
    $this->deleteJson(route('v1.expense-categories.destroy', $old))->assertNoContent();

    $this->postJson(route('v1.expense-categories.store'), categoryPayload(['name' => 'travel', 'color' => '#ef4444', 'description' => 'Trips']))
        ->assertCreated()
        ->assertJsonPath('data.id', $old->id)
        ->assertJsonPath('data.name', 'travel')
        ->assertJsonPath('data.color', '#EF4444')
        ->assertJsonPath('data.status', 'active')
        ->assertJsonPath('data.description', 'Trips');

    expect(categoryRows($this->companyA))->toHaveCount(1)
        ->and(categoryRows($this->companyA)->first()->deleted_at)->toBeNull();
});

test('4. updating while keeping its own name (or changing its case) passes; a sibling\'s or a deleted category\'s name does not', function () {
    [$mine, $sibling, $gone] = categoriesFor($this->companyA, 3)->all();
    actAsCategoryUser($this->companyA);
    $this->deleteJson(route('v1.expense-categories.destroy', $gone))->assertNoContent();

    $this->putJson(route('v1.expense-categories.update', $mine), categoryPayload(['name' => $mine->name, 'description' => 'Changed']))
        ->assertOk()
        ->assertJsonPath('data.name', $mine->name)
        ->assertJsonPath('data.description', 'Changed');

    $this->putJson(route('v1.expense-categories.update', $mine), categoryPayload(['name' => strtoupper($mine->name)]))
        ->assertOk()
        ->assertJsonPath('data.name', strtoupper($mine->name));

    $this->putJson(route('v1.expense-categories.update', $mine), categoryPayload(['name' => strtolower($sibling->name)]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['name' => 'An expense category with this name already exists.']);

    $this->putJson(route('v1.expense-categories.update', $mine), categoryPayload(['name' => $gone->name]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['name' => 'A deleted category uses this name. Add it as a new category to restore it.']);
});

test('5. an invalid color is rejected; a valid #RRGGBB passes in either case', function (string $color, bool $valid) {
    actAsCategoryUser($this->companyA);

    $response = $this->postJson(route('v1.expense-categories.store'), categoryPayload(['color' => $color]));

    if ($valid) {
        $response->assertCreated()->assertJsonPath('data.color', strtoupper(trim($color)));
    } else {
        $response->assertUnprocessable()->assertJsonValidationErrors(['color']);
    }
})->with([
    'a word' => ['blue', false],
    'three digits' => ['#FFF', false],
    'not hex' => ['#GGGGGG', false],
    'missing #' => ['3B82F6', false],
    'eight digits' => ['#3B82F6FF', false],
    'empty' => ['', false],
    'uppercase' => ['#3B82F6', true],
    'lowercase' => ['#8b5cf6', true],
    'padded' => [' #f59e0b ', true],
]);

test('6. the name is required (blank or spaces); name and description lengths are capped', function () {
    actAsCategoryUser($this->companyA);

    foreach (['', '   '] as $blank) {
        $this->postJson(route('v1.expense-categories.store'), categoryPayload(['name' => $blank]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['name' => 'The category name is required.']);
    }
    $this->postJson(route('v1.expense-categories.store'), categoryPayload(['name' => str_repeat('a', 256)]))
        ->assertJsonValidationErrors(['name']);
    $this->postJson(route('v1.expense-categories.store'), categoryPayload(['description' => str_repeat('a', 1001)]))
        ->assertJsonValidationErrors(['description']);
    $this->postJson(route('v1.expense-categories.store'), categoryPayload(['status' => 'archived']))
        ->assertJsonValidationErrors(['status']);

    // Optional: no description, no status → null description, Active.
    $this->postJson(route('v1.expense-categories.store'), ['name' => 'Bare', 'color' => '#3B82F6', 'description' => ''])
        ->assertCreated()
        ->assertJsonPath('data.description', null)
        ->assertJsonPath('data.status', 'active');
});

// ───────────────────────────── tenant isolation

test('7. company A cannot read, update, delete or toggle company B\'s category — all 404, nothing changes', function () {
    $theirs = categoriesFor($this->companyB, 1, ['name' => 'B Category', 'status' => ExpenseCategoryStatus::Active])->first();
    actAsCategoryUser($this->companyA);

    $this->getJson(route('v1.expense-categories.show', $theirs))->assertNotFound();
    $this->putJson(route('v1.expense-categories.update', $theirs), categoryPayload(['name' => 'Hijacked']))->assertNotFound();
    $this->patchJson(route('v1.expense-categories.toggle-status', $theirs))->assertNotFound();
    $this->deleteJson(route('v1.expense-categories.destroy', $theirs))->assertNotFound();

    $row = DB::table('expense_categories')->where('id', $theirs->id)->first();
    expect($row->name)->toBe('B Category')
        ->and($row->status)->toBe('active')
        ->and($row->deleted_at)->toBeNull();
});

test('8. company A\'s index never contains company B\'s categories, whatever the filters', function (array $query, bool $expectsMine) {
    categoriesFor($this->companyA, 3, ['description' => 'Shared words']);
    categoriesFor($this->companyB, 3, ['description' => 'Shared words']);
    categoriesFor($this->companyB, 1, ['description' => 'Shared words', 'status' => ExpenseCategoryStatus::Inactive]);
    actAsCategoryUser($this->companyA);

    $ids = collect($this->getJson(route('v1.expense-categories.index', $query))->assertOk()->json('data'))->pluck('id')->sort()->values();
    $mine = categoryRows($this->companyA)->pluck('id');
    $theirs = categoryRows($this->companyB)->pluck('id');

    expect($ids->intersect($theirs))->toBeEmpty()
        // …and A gets exactly its own matching rows, so "no overlap" is never vacuous.
        ->and($ids->all())->toBe($expectsMine ? $mine->all() : []);
})->with([
    'no filters' => [[], true],
    'search' => [['search' => 'Shared'], true],
    'status inactive (A has none)' => [['status' => 'inactive'], false],
    'status active' => [['status' => 'active'], true],
    'sorted, 100 per page' => [['sort' => 'name', 'direction' => 'desc', 'per_page' => 100], true],
]);

// ───────────────────────────── list

test('9. search matches name and description; the status filter narrows', function () {
    Tenancy::instance()->runAs($this->companyA, function () {
        ExpenseCategory::factory()->create(['name' => 'Zeta Travel', 'description' => 'Flights']);
        ExpenseCategory::factory()->create(['name' => 'Beta', 'description' => 'Zebra crossings']);
        ExpenseCategory::factory()->inactive()->create(['name' => 'Delta', 'description' => null]);
    });
    actAsCategoryUser($this->companyA);
    $names = fn (array $q) => collect($this->getJson(route('v1.expense-categories.index', $q))->assertOk()->json('data'))->pluck('name')->sort()->values()->all();

    expect($names(['search' => 'zeta']))->toBe(['Zeta Travel'])     // name
        ->and($names(['search' => 'zebra']))->toBe(['Beta'])          // description
        ->and($names(['search' => '50%_']))->toBe([])                 // LIKE wildcards are literal
        ->and($names(['search' => '   ']))->toBe(['Beta', 'Delta', 'Zeta Travel'])
        ->and($names(['status' => 'inactive']))->toBe(['Delta'])
        ->and($names(['status' => 'active']))->toBe(['Beta', 'Zeta Travel']);

    $this->getJson(route('v1.expense-categories.index', ['status' => 'archived']))->assertUnprocessable();
});

test('10. a sort column outside the whitelist is rejected with 422; name, status and created_at sort both ways', function () {
    categoriesFor($this->companyA, 2);
    categoriesFor($this->companyA, 2, ['status' => ExpenseCategoryStatus::Inactive]);
    actAsCategoryUser($this->companyA);

    foreach (['company_id', 'color', 'description', 'password', 'name;drop table expense_categories'] as $bad) {
        $this->getJson(route('v1.expense-categories.index', ['sort' => $bad]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['sort' => 'The list cannot be sorted by this column.']);
    }

    foreach (['name', 'status', 'created_at'] as $column) {
        foreach (['asc', 'desc'] as $direction) {
            $values = collect($this->getJson(route('v1.expense-categories.index', ['sort' => $column, 'direction' => $direction]))->assertOk()->json('data'))
                ->pluck($column)->all();
            $sorted = $values;
            $direction === 'asc' ? sort($sorted) : rsort($sorted);
            expect($values)->toBe($sorted);
        }
    }
});

test('the default order is oldest first, and pagination defaults to 10 (max 100)', function () {
    categoriesFor($this->companyA, 12);
    actAsCategoryUser($this->companyA);

    $first = $this->getJson(route('v1.expense-categories.index'))
        ->assertOk()
        ->assertJsonCount(10, 'data')
        ->assertJsonPath('meta.total', 12)
        ->assertJsonPath('meta.per_page', 10)
        ->assertJsonPath('meta.last_page', 2);
    expect(collect($first->json('data'))->pluck('id')->all())->toBe(categoryRows($this->companyA)->pluck('id')->take(10)->all());

    $this->getJson(route('v1.expense-categories.index', ['page' => 2]))->assertJsonCount(2, 'data');
    $this->getJson(route('v1.expense-categories.index', ['per_page' => 101]))->assertUnprocessable();
});

// ───────────────────────────── toggle + delete

test('11. toggle-status flips and persists, both ways', function () {
    $category = categoriesFor($this->companyA)->first();
    actAsCategoryUser($this->companyA);

    $this->patchJson(route('v1.expense-categories.toggle-status', $category))->assertOk()
        ->assertJsonPath('data.status', 'inactive')->assertJsonPath('data.status_label', 'Inactive');
    expect(DB::table('expense_categories')->where('id', $category->id)->value('status'))->toBe('inactive');

    $this->patchJson(route('v1.expense-categories.toggle-status', $category))->assertOk()->assertJsonPath('data.status', 'active');
    expect(DB::table('expense_categories')->where('id', $category->id)->value('status'))->toBe('active');
});

test('12. delete soft-deletes: gone from the index and show, row kept; still invisible to company B', function () {
    $category = categoriesFor($this->companyA)->first();
    actAsCategoryUser($this->companyA);

    $this->deleteJson(route('v1.expense-categories.destroy', $category))->assertNoContent();

    expect(DB::table('expense_categories')->where('id', $category->id)->value('deleted_at'))->not->toBeNull();
    $this->getJson(route('v1.expense-categories.index'))->assertJsonPath('meta.total', 0);
    $this->getJson(route('v1.expense-categories.show', $category))->assertNotFound();

    actAsCategoryUser($this->companyB);
    $this->getJson(route('v1.expense-categories.show', $category))->assertNotFound();
    $this->getJson(route('v1.expense-categories.index'))->assertJsonPath('meta.total', 0);
});

// ───────────────────────────── new companies get the defaults

const DEFAULT_CATEGORY_ROWS = [
    ['Travel', '#3B82F6', 'Travel and transportation expenses'],
    ['Office Supplies', '#10B77F', 'Office equipment and supplies'],
    ['Software', '#8B5CF6', 'Software licenses and subscriptions'],
    ['Marketing', '#F59E0B', 'Marketing and advertising expenses'],
    ['Meals', '#EF4444', 'Business meals and entertainment'],
];

function defaultRowsOf(User $company): array
{
    return categoryRows($company)->map(fn ($r) => [$r->name, $r->color, $r->description])->all();
}

test('13. a company created by a super admin has exactly the five defaults, all active, and they show in its list', function () {
    actAsCategoryUser(User::factory()->superAdmin()->create());

    // Login enabled, so the new company can then open its own list (a login-disabled company
    // is refused by the API altogether).
    $id = $this->postJson(route('v1.admin.companies.store'), [
        'name' => 'New Co', 'email' => 'new@co.test', 'enable_login' => true, 'password' => 'password', 'password_confirmation' => 'password',
    ])
        ->assertCreated()
        ->json('data.id');
    $company = User::query()->findOrFail($id);

    expect(defaultRowsOf($company))->toBe(DEFAULT_CATEGORY_ROWS)
        ->and(categoryRows($company)->pluck('status')->unique()->all())->toBe(['active']);

    actAsCategoryUser($company);
    $this->getJson(route('v1.expense-categories.index'))
        ->assertOk()
        ->assertJsonPath('meta.total', 5)
        ->assertJsonPath('data.0.name', 'Travel')
        ->assertJsonPath('data.4.name', 'Meals');
});

test('13b. a company that registers itself gets the same five defaults', function () {
    $this->postJson(route('v1.auth.register'), [
        'name' => 'Self Signup', 'email' => 'self@signup.test', 'password' => 'password', 'password_confirmation' => 'password',
    ])->assertCreated();

    expect(defaultRowsOf(User::query()->where('email', 'self@signup.test')->firstOrFail()))->toBe(DEFAULT_CATEGORY_ROWS);
});

test('13c. setting a company up again never duplicates the defaults, and never brings back one it deleted', function () {
    $setup = app(CompanySetupService::class);
    $company = Company::query()->findOrFail($this->companyA->id);

    expect($setup->seedExpenseCategories($company))->toBe(5)
        ->and($setup->seedExpenseCategories($company))->toBe(0);
    $setup->setUp($company);
    expect(categoryRows($this->companyA))->toHaveCount(5);

    // The company deletes "Meals": a re-run does not bring it back (deleted rows count).
    actAsCategoryUser($this->companyA);
    $meals = ExpenseCategory::query()->where('name', 'Meals')->firstOrFail();
    $this->deleteJson(route('v1.expense-categories.destroy', $meals))->assertNoContent();

    expect($setup->seedExpenseCategories($company))->toBe(0)
        ->and(categoryRows($this->companyA)->whereNull('deleted_at')->pluck('name')->all())->toBe(['Travel', 'Office Supplies', 'Software', 'Marketing'])
        // Company B was never touched.
        ->and(categoryRows($this->companyB))->toBeEmpty();
});

test('13d. defaults are per company: two companies each get their own "Travel"', function () {
    $setup = app(CompanySetupService::class);
    $setup->seedExpenseCategories(Company::query()->findOrFail($this->companyA->id));
    $setup->seedExpenseCategories(Company::query()->findOrFail($this->companyB->id));

    expect(DB::table('expense_categories')->where('name', 'Travel')->pluck('company_id')->sort()->values()->all())
        ->toBe(collect([$this->companyA->id, $this->companyB->id])->sort()->values()->all());
});

// ───────────────────────────── access

test('14. a guest gets 401 and a super admin 403 on every expense-category route', function (string $method, string $route, bool $bound) {
    $category = categoriesFor($this->companyA)->first();
    $url = route($route, $bound ? $category : []);

    $this->json($method, $url, categoryPayload())->assertUnauthorized();

    // role:company runs before route-model binding (bootstrap/app.php priority list), so the
    // {category} routes answer 403 too instead of resolving the category first.
    actAsCategoryUser(User::factory()->superAdmin()->create());
    $this->json($method, $url, categoryPayload())->assertForbidden()->assertJsonStructure(['message']);

    $row = DB::table('expense_categories')->where('id', $category->id)->first();
    expect($row->deleted_at)->toBeNull()
        ->and($row->name)->toBe($category->name)
        ->and($row->status)->toBe('active');
    expect(DB::table('expense_categories')->count())->toBe(1);
})->with([
    'index' => ['GET', 'v1.expense-categories.index', false],
    'store' => ['POST', 'v1.expense-categories.store', false],
    'show' => ['GET', 'v1.expense-categories.show', true],
    'update' => ['PUT', 'v1.expense-categories.update', true],
    'destroy' => ['DELETE', 'v1.expense-categories.destroy', true],
    'toggle' => ['PATCH', 'v1.expense-categories.toggle-status', true],
]);

test('the resource exposes the form fields and never the owner', function () {
    $category = categoriesFor($this->companyA, 1, ['name' => 'Travel', 'color' => '#3b82f6', 'description' => 'Trips'])->first();
    actAsCategoryUser($this->companyA);

    $data = $this->getJson(route('v1.expense-categories.show', $category))->assertOk()->json('data');

    expect(array_keys($data))->toBe(['id', 'name', 'description', 'color', 'status', 'status_label', 'created_at', 'updated_at'])
        ->and($data['color'])->toBe('#3B82F6');
});
