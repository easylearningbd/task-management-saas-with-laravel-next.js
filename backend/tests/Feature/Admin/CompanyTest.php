<?php

use App\Enums\PlanDuration;
use App\Enums\UserType;
use App\Models\Company;
use App\Models\CompanyActivity;
use App\Models\Plan;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Illuminate\Support\Carbon;

/* /api/v1/admin/companies (+ /activities) — Super Admin company CRUD, login toggle, password
   reset, plan change and the activity log. Companies are `users` rows (type = company).
   Runs on the isolated sqlite :memory: database. */

beforeEach(function () {
    $this->seed(PlanSeeder::class); // Free (default), Starter, Pro
    $this->admin = User::factory()->superAdmin()->create(['name' => 'Root Admin']);
    $this->actingAs($this->admin, 'web');
});

function companyPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Acme Inc',
        'email' => 'owner@acme.test',
        'enable_login' => false,
    ], $overrides);
}

/** Log out the admin and try the company login endpoint. */
function companyLogin($test, string $email, string $password)
{
    auth()->guard('web')->logout();
    // Sanctum's request guard caches the user for the app instance's lifetime; drop it too.
    app('auth')->forgetGuards();

    return $test->postJson(route('v1.auth.login'), ['email' => $email, 'password' => $password]);
}

// ───────────────────────────── 1–4: create

test('1. create with Enable Login off → company, default plan, cannot log in', function () {
    $id = $this->postJson(route('v1.admin.companies.store'), companyPayload())
        ->assertCreated()
        ->assertJsonPath('data.name', 'Acme Inc')
        ->assertJsonPath('data.status', 'active')
        ->assertJsonPath('data.status_label', 'Active')
        ->assertJsonPath('data.is_login_enabled', false)
        ->assertJsonPath('data.plan.name', 'Free')
        ->assertJsonPath('data.plan_duration', 'monthly')
        ->assertJsonMissingPath('data.password')
        ->json('data.id');

    $company = Company::findOrFail($id);
    expect($company->type)->toBe(UserType::Company)->and($company->plan->is_default)->toBeTrue();

    companyLogin($this, 'owner@acme.test', 'password')->assertStatus(422); // random password: nothing works
    companyLogin($this, 'owner@acme.test', '')->assertStatus(422);
    $this->assertGuest('web');
});

test('2. create with Enable Login on + password → the company can log in', function () {
    $this->postJson(route('v1.admin.companies.store'), companyPayload([
        'enable_login' => true, 'password' => 'Secret-pass-123', 'password_confirmation' => 'Secret-pass-123',
    ]))->assertCreated()->assertJsonPath('data.is_login_enabled', true);

    companyLogin($this, 'owner@acme.test', 'Secret-pass-123')->assertOk();
    $this->assertAuthenticatedAs(Company::where('email', 'owner@acme.test')->first()->fresh(), 'web');
});

test('2b. Enable Login on requires a confirmed password', function () {
    $this->postJson(route('v1.admin.companies.store'), companyPayload(['enable_login' => true]))
        ->assertUnprocessable()->assertJsonValidationErrors(['password' => 'A password is required when login is enabled.']);
    $this->postJson(route('v1.admin.companies.store'), companyPayload(['enable_login' => true, 'password' => 'Secret-pass-123', 'password_confirmation' => 'nope']))
        ->assertUnprocessable()->assertJsonValidationErrors(['password' => 'The passwords do not match.']);
    expect(Company::count())->toBe(0);
});

test('3. duplicate email → 422 (any user, deleted ones too); keeping its own email on update passes', function () {
    $existing = Company::factory()->create(['email' => 'taken@acme.test']);

    $this->postJson(route('v1.admin.companies.store'), companyPayload(['email' => 'taken@acme.test']))
        ->assertUnprocessable()->assertJsonValidationErrors(['email' => 'This email address is already in use.']);
    $this->postJson(route('v1.admin.companies.store'), companyPayload(['email' => $this->admin->email]))
        ->assertUnprocessable()->assertJsonValidationErrors(['email']);
    Company::factory()->create(['email' => 'gone@acme.test'])->delete();
    $this->postJson(route('v1.admin.companies.store'), companyPayload(['email' => 'gone@acme.test']))
        ->assertUnprocessable()->assertJsonValidationErrors(['email']);

    $this->putJson(route('v1.admin.companies.update', $existing), ['name' => 'Renamed', 'email' => 'taken@acme.test', 'status' => 'active'])
        ->assertOk()->assertJsonPath('data.name', 'Renamed');
});

test('4. create never sets type = super_admin (or plan / status) from the payload', function () {
    $pro = Plan::where('name', 'Pro')->first();
    $id = $this->postJson(route('v1.admin.companies.store'), companyPayload(['type' => 'super_admin', 'plan_id' => $pro->id, 'status' => 'inactive']))
        ->assertCreated()->json('data.id');

    $user = User::findOrFail($id);
    expect($user->type)->toBe(UserType::Company)->and($user->plan->name)->toBe('Free')->and($user->status->value)->toBe('active');
});

// ───────────────────────────── 5–7: update, login, password

test('5. update changes name, email and status; a blank password keeps the hash', function () {
    $company = Company::factory()->create();
    $hash = $company->password;

    $this->putJson(route('v1.admin.companies.update', $company), [
        'name' => 'New Name', 'email' => 'new@acme.test', 'status' => 'inactive', 'password' => '', 'password_confirmation' => '',
    ])->assertOk()
        ->assertJsonPath('data.name', 'New Name')
        ->assertJsonPath('data.email', 'new@acme.test')
        ->assertJsonPath('data.status', 'inactive')
        ->assertJsonPath('data.status_label', 'Inactive')
        ->assertJsonPath('data.is_login_enabled', true); // status never touches login

    expect($company->refresh()->password)->toBe($hash);
    companyLogin($this, 'new@acme.test', 'password')->assertOk(); // same password still works
});

test('5b. update can set a new password; turning login on without ever having one is refused', function () {
    $company = Company::factory()->create();
    $this->putJson(route('v1.admin.companies.update', $company), [
        'name' => $company->name, 'email' => $company->email, 'status' => 'active', 'password' => 'Changed-pass-77', 'password_confirmation' => 'Changed-pass-77',
    ])->assertOk();

    $noPassword = Company::findOrFail($this->postJson(route('v1.admin.companies.store'), companyPayload(['email' => 'np@acme.test']))->json('data.id'));
    $this->putJson(route('v1.admin.companies.update', $noPassword), ['name' => 'NP', 'email' => 'np@acme.test', 'status' => 'active', 'enable_login' => true])
        ->assertUnprocessable()->assertJsonValidationErrors(['password' => 'This company has no password yet. Set one to enable login.']);
    $this->getJson(route('v1.admin.companies.show', $noPassword))->assertJsonPath('data.has_password', false);

    companyLogin($this, $company->email, 'Changed-pass-77')->assertOk();
});

test('6. toggle-login flips the flag (status untouched); a disabled company is rejected with the M1 message', function () {
    $company = Company::factory()->create();

    $this->patchJson(route('v1.admin.companies.toggle-login', $company))
        ->assertOk()->assertJsonPath('data.is_login_enabled', false)->assertJsonPath('data.status', 'active');
    expect($company->refresh()->is_login_enabled)->toBeFalse();

    companyLogin($this, $company->email, 'password')
        ->assertForbidden()->assertExactJson(['message' => 'Your account is disabled. Contact the administrator.']);

    $this->actingAs($this->admin, 'web');
    $this->patchJson(route('v1.admin.companies.toggle-login', $company))->assertOk()->assertJsonPath('data.is_login_enabled', true);
    companyLogin($this, $company->email, 'password')->assertOk();
});

test('7. reset password sets a new working password and invalidates the old one', function () {
    $company = Company::factory()->create();

    $this->patchJson(route('v1.admin.companies.reset-password', $company), ['password' => 'Fresh-pass-2027', 'password_confirmation' => 'Fresh-pass-2027'])
        ->assertOk();
    $this->patchJson(route('v1.admin.companies.reset-password', $company), ['password' => 'short', 'password_confirmation' => 'short'])
        ->assertUnprocessable()->assertJsonValidationErrors(['password']);

    companyLogin($this, $company->email, 'password')->assertStatus(422);
    companyLogin($this, $company->email, 'Fresh-pass-2027')->assertOk();
});

// ───────────────────────────── 8–10: plan, activity

test('8. change-plan assigns plan + duration, expiry for monthly and yearly, clears the trial, logs plan_changed', function () {
    Carbon::setTestNow('2027-01-31 10:00:00');
    $company = Company::factory()->create(['trial_ends_at' => now()->addDays(5)]);
    $pro = Plan::where('name', 'Pro')->first();

    $this->patchJson(route('v1.admin.companies.change-plan', $company), ['plan_id' => $pro->id, 'duration' => 'monthly'])
        ->assertOk()
        ->assertJsonPath('data.plan.name', 'Pro')
        ->assertJsonPath('data.plan_duration', 'monthly')
        ->assertJsonPath('data.plan_expires_at', '2027-02-28T10:00:00+00:00')
        ->assertJsonPath('data.trial_ends_at', null);

    $this->patchJson(route('v1.admin.companies.change-plan', $company), ['plan_id' => $pro->id, 'duration' => 'yearly'])
        ->assertOk()->assertJsonPath('data.plan_duration', 'yearly')->assertJsonPath('data.plan_expires_at', '2028-01-31T10:00:00+00:00');

    $log = $company->activities()->first();
    expect($log->action->value)->toBe('plan_changed')
        ->and($log->meta)->toBe(['from' => ['plan' => 'Pro', 'duration' => 'monthly'], 'to' => ['plan' => 'Pro', 'duration' => 'yearly']])
        ->and($company->refresh()->plan_duration)->toBe(PlanDuration::Yearly);
    Carbon::setTestNow();
});

test('9. change-plan to an inactive, deleted or non-existent plan → 422', function (string $which) {
    $company = Company::factory()->create();
    $planId = match ($which) {
        'inactive' => Plan::factory()->inactive()->create()->id,
        'deleted' => tap(Plan::factory()->create())->delete()->id,
        'missing' => 999999,
    };

    $this->patchJson(route('v1.admin.companies.change-plan', $company), ['plan_id' => $planId, 'duration' => 'monthly'])
        ->assertUnprocessable()->assertJsonValidationErrors(['plan_id' => 'This plan is not available.']);
    $this->patchJson(route('v1.admin.companies.change-plan', $company), ['plan_id' => Plan::first()->id, 'duration' => 'weekly'])
        ->assertUnprocessable()->assertJsonValidationErrors(['duration']);
    expect($company->activities()->count())->toBe(0);
})->with(['inactive', 'deleted', 'missing']);

test('10. every mutating action writes exactly one activity row with the acting admin', function () {
    $pro = Plan::where('name', 'Pro')->first();
    $id = $this->postJson(route('v1.admin.companies.store'), companyPayload())->json('data.id');
    $company = Company::findOrFail($id);
    $count = fn () => CompanyActivity::where('company_id', $id)->count();

    $steps = [
        'created' => fn () => null,
        'updated' => fn () => $this->putJson(route('v1.admin.companies.update', $company), ['name' => 'X', 'email' => 'owner@acme.test', 'status' => 'active'])->assertOk(),
        'password_reset' => fn () => $this->patchJson(route('v1.admin.companies.reset-password', $company), ['password' => 'Fresh-pass-2027', 'password_confirmation' => 'Fresh-pass-2027'])->assertOk(),
        'login_enabled' => fn () => $this->patchJson(route('v1.admin.companies.toggle-login', $company))->assertOk(),
        'login_disabled' => fn () => $this->patchJson(route('v1.admin.companies.toggle-login', $company))->assertOk(),
        'plan_changed' => fn () => $this->patchJson(route('v1.admin.companies.change-plan', $company), ['plan_id' => $pro->id, 'duration' => 'monthly'])->assertOk(),
        'deleted' => fn () => $this->deleteJson(route('v1.admin.companies.destroy', $company))->assertNoContent(),
    ];

    $expected = 0;
    foreach ($steps as $action => $step) {
        $step();
        $expected++;
        expect($count())->toBe($expected, "after {$action}");
        $latest = CompanyActivity::where('company_id', $id)->latestFirst()->first();
        expect($latest->action->value)->toBe($action)->and($latest->actor_id)->toBe($this->admin->id);
    }

    // A failed action writes nothing.
    $this->patchJson(route('v1.admin.companies.change-plan', Company::factory()->create()), ['plan_id' => 999999, 'duration' => 'monthly'])->assertUnprocessable();
    expect(CompanyActivity::count())->toBe(7);
});

test('10b. the activity endpoints: per company and global, newest first, with company + actor', function () {
    $a = Company::factory()->create(['name' => 'Alpha']);
    $b = Company::factory()->create(['name' => 'Beta']);
    $this->patchJson(route('v1.admin.companies.toggle-login', $a));
    $this->patchJson(route('v1.admin.companies.toggle-login', $b));
    $this->patchJson(route('v1.admin.companies.toggle-login', $a));

    $this->getJson(route('v1.admin.companies.activities', $a))
        ->assertOk()->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.action', 'login_enabled')
        ->assertJsonPath('data.0.action_label', 'Login enabled')
        ->assertJsonPath('data.0.actor.name', 'Root Admin')
        ->assertJsonPath('data.1.action', 'login_disabled');

    $this->getJson(route('v1.admin.activities.index', ['per_page' => 2]))
        ->assertOk()->assertJsonCount(2, 'data')->assertJsonPath('meta.total', 3)
        ->assertJsonPath('data.0.company.name', 'Alpha')
        ->assertJsonPath('data.1.company.name', 'Beta');
    $this->getJson(route('v1.admin.activities.index', ['action' => 'login_enabled']))->assertJsonPath('meta.total', 1);
});

// ───────────────────────────── 11–14: list

test('11. search matches name and email; status, plan and created-date filters narrow', function () {
    $pro = Plan::where('name', 'Pro')->first();
    $free = Plan::where('name', 'Free')->first();
    Company::factory()->onPlan($pro)->create(['name' => 'Healthcare Systems', 'email' => 'admin@healthcare.com', 'created_at' => now()->subDays(20)]);
    Company::factory()->onPlan($free)->inactive()->create(['name' => 'Creative Agency', 'email' => 'hello@studio.io', 'created_at' => now()->subDays(5)]);
    Company::factory()->create(['name' => 'No Plan Co', 'email' => 'np@nowhere.io', 'created_at' => now()->subDays(1)]);
    $names = fn (array $q) => collect($this->getJson(route('v1.admin.companies.index', $q))->assertOk()->json('data'))->pluck('name')->all();

    expect($names(['search' => 'health']))->toBe(['Healthcare Systems'])  // name
        ->and($names(['search' => 'studio.io']))->toBe(['Creative Agency'])  // email
        ->and($names(['status' => 'inactive']))->toBe(['Creative Agency'])
        ->and($names(['status' => 'active']))->toBe(['Healthcare Systems', 'No Plan Co'])
        ->and($names(['plan_id' => $pro->id]))->toBe(['Healthcare Systems'])
        ->and($names(['created_from' => now()->subDays(6)->toDateString()]))->toBe(['Creative Agency', 'No Plan Co'])
        ->and($names(['created_from' => now()->subDays(25)->toDateString(), 'created_to' => now()->subDays(10)->toDateString()]))->toBe(['Healthcare Systems'])
        ->and($names(['status' => 'active', 'search' => 'o', 'created_from' => now()->subDays(3)->toDateString()]))->toBe(['No Plan Co']);

    $this->getJson(route('v1.admin.companies.index'))->assertJsonPath('data.2.plan', null)->assertJsonPath('data.0.plan.name', 'Pro');
    $this->getJson(route('v1.admin.companies.index', ['status' => 'banned', 'created_from' => '2027-02-02', 'created_to' => '2027-02-01']))
        ->assertUnprocessable()->assertJsonValidationErrors(['status', 'created_to']);
});

test('12. a non-whitelisted sort column is rejected with 422; whitelisted ones sort both ways', function () {
    foreach (['password', 'type', 'plan_id', 'name; DROP TABLE users'] as $sort) {
        $this->getJson(route('v1.admin.companies.index', ['sort' => $sort]))
            ->assertUnprocessable()->assertJsonValidationErrors(['sort' => 'The list cannot be sorted by this column.']);
    }

    Company::factory()->create(['name' => 'Bravo', 'email' => 'c@x.io', 'created_at' => now()->subDays(3)]);
    Company::factory()->inactive()->create(['name' => 'Alpha', 'email' => 'b@x.io', 'created_at' => now()->subDays(2)]);
    Company::factory()->create(['name' => 'Charlie', 'email' => 'a@x.io', 'created_at' => now()->subDays(1)]);
    $order = fn (array $q) => collect($this->getJson(route('v1.admin.companies.index', $q))->json('data'))->pluck('name')->all();

    expect($order([]))->toBe(['Bravo', 'Alpha', 'Charlie'])  // default: created_at ascending
        ->and($order(['sort' => 'name']))->toBe(['Alpha', 'Bravo', 'Charlie'])
        ->and($order(['sort' => 'name', 'direction' => 'desc']))->toBe(['Charlie', 'Bravo', 'Alpha'])
        ->and($order(['sort' => 'email']))->toBe(['Charlie', 'Alpha', 'Bravo'])
        ->and($order(['sort' => 'status']))->toBe(['Bravo', 'Charlie', 'Alpha'])  // active < inactive
        ->and($order(['sort' => 'created_at', 'direction' => 'desc']))->toBe(['Charlie', 'Alpha', 'Bravo']);
});

test('13. delete soft-deletes; the row leaves the index and show 404s', function () {
    $gone = Company::factory()->create(['name' => 'Gone']);
    Company::factory()->create(['name' => 'Stays']);

    $this->deleteJson(route('v1.admin.companies.destroy', $gone))->assertNoContent();

    expect(Company::find($gone->id))->toBeNull()->and(Company::withTrashed()->find($gone->id)->trashed())->toBeTrue();
    expect(collect($this->getJson(route('v1.admin.companies.index'))->json('data'))->pluck('name')->all())->toBe(['Stays']);
    $this->getJson(route('v1.admin.companies.show', $gone))->assertNotFound();
});

test('14. the index never returns super admins — not even with crafted filters; their ids 404', function () {
    Company::factory()->create(['name' => 'Real Co']);
    $other = User::factory()->superAdmin()->create(['name' => 'Another Admin', 'email' => 'admin2@x.io']);

    foreach ([[], ['search' => 'admin'], ['search' => $this->admin->email], ['per_page' => 100], ['type' => 'super_admin'], ['status' => 'active']] as $query) {
        $emails = collect($this->getJson(route('v1.admin.companies.index', $query))->assertOk()->json('data'))->pluck('email');
        expect($emails)->not->toContain($this->admin->email)->not->toContain('admin2@x.io');
    }

    $this->getJson(route('v1.admin.companies.show', $other))->assertNotFound();
    $this->putJson(route('v1.admin.companies.update', $other), ['name' => 'Hijack', 'email' => 'admin2@x.io', 'status' => 'active'])->assertNotFound();
    $this->deleteJson(route('v1.admin.companies.destroy', $other))->assertNotFound();
    $this->patchJson(route('v1.admin.companies.toggle-login', $other))->assertNotFound();
    expect($other->refresh()->name)->toBe('Another Admin')->and($other->is_login_enabled)->toBeTrue();
});

test('14b. the details payload: plan, limits, honest zero usage, recent activity', function () {
    $pro = Plan::where('name', 'Pro')->first();
    $company = Company::factory()->onPlan($pro, PlanDuration::Yearly)->create();
    $this->patchJson(route('v1.admin.companies.toggle-login', $company));

    $this->getJson(route('v1.admin.companies.show', $company))
        ->assertOk()
        ->assertJsonPath('data.plan.name', 'Pro')
        ->assertJsonPath('data.plan.monthly_price', '49.99')
        ->assertJsonPath('data.plan_duration_label', 'Yearly')
        ->assertJsonPath('data.limits', ['max_projects' => -1, 'storage_limit_gb' => '50.00'])
        ->assertJsonPath('data.usage', ['projects' => 0, 'storage_bytes' => 0])
        ->assertJsonPath('data.has_password', true)
        ->assertJsonCount(1, 'data.recent_activities')
        ->assertJsonPath('data.recent_activities.0.action', 'login_disabled');
});

// ───────────────────────────── 15: access

test('15a. a company user gets 403 on every company route', function (string $method, string $route, bool $needsCompany) {
    $target = Company::factory()->create();
    $this->actingAs(User::factory()->company()->create(), 'web');

    $this->json($method, route($route, $needsCompany ? $target : []), companyPayload(['plan_id' => 1, 'duration' => 'monthly', 'password' => 'x']))
        ->assertForbidden();

    expect(Company::find($target->id))->not->toBeNull()->and(CompanyActivity::count())->toBe(0);
})->with('company routes');

test('15b. unauthenticated requests get 401 on every company route', function (string $method, string $route, bool $needsCompany) {
    $target = Company::factory()->create();
    auth()->guard('web')->logout();

    $this->json($method, route($route, $needsCompany ? $target : []), companyPayload())->assertUnauthorized();
})->with('company routes');

dataset('company routes', [
    'index' => ['GET', 'v1.admin.companies.index', false],
    'store' => ['POST', 'v1.admin.companies.store', false],
    'show' => ['GET', 'v1.admin.companies.show', true],
    'update' => ['PUT', 'v1.admin.companies.update', true],
    'destroy' => ['DELETE', 'v1.admin.companies.destroy', true],
    'toggle-login' => ['PATCH', 'v1.admin.companies.toggle-login', true],
    'reset-password' => ['PATCH', 'v1.admin.companies.reset-password', true],
    'change-plan' => ['PATCH', 'v1.admin.companies.change-plan', true],
    'activities' => ['GET', 'v1.admin.companies.activities', true],
    'global activities' => ['GET', 'v1.admin.activities.index', false],
]);
