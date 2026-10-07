<?php

use App\Enums\CompanyActivityAction;
use App\Models\Company;
use App\Models\CompanyActivity;
use App\Models\User;
use Database\Seeders\PlanSeeder;
use Illuminate\Testing\TestResponse;

/* "Login as company" (POST /api/v1/admin/companies/{company}/impersonate) and "Back to Admin"
   (POST /api/v1/stop-impersonating). These tests behave like a browser: the admin signs in
   through the real login endpoint, the session cookie is carried from response to request,
   sessions live in the (sqlite) database, and the session store and auth guards are rebuilt
   for every request — so nothing cached in memory can hide a broken switch. */

beforeEach(function () {
    config(['session.driver' => 'database']);
    $this->seed(PlanSeeder::class);
    $this->admin = User::factory()->superAdmin()->create(['name' => 'Root Admin', 'email' => 'root@admin.test']);
    $this->company = Company::factory()->create(['name' => 'Acme Inc', 'email' => 'owner@acme.test']);
    $this->sessionId = null;
});

/** One browser request: send the current session cookie, keep the one the response sets. */
function browse($test, string $method, string $uri, array $data = []): TestResponse
{
    // Fresh session store + guards, like a new PHP process: the container caches its own
    // `session.store` instance separately from the manager, so drop both.
    app('session')->forgetDrivers();
    app()->forgetInstance('session.store');
    app('auth')->forgetGuards();
    $name = config('session.cookie');
    // JSON test requests only send cookies "with credentials" — like the SPA's axios.
    $test->withCredentials()->withCookie($name, $test->sessionId ?? ''); // '' = no session (a guest)

    $response = $test->json($method, $uri, $data);

    if ($cookie = $response->getCookie($name)) {
        $test->sessionId = $cookie->getValue();
    }

    return $response;
}

function signInAdmin($test): void
{
    browse($test, 'POST', route('v1.admin.auth.login'), ['email' => 'root@admin.test', 'password' => 'password'])->assertOk();
}

test('1. start → /me is the company (is_impersonating, impersonator); stop → /me is the admin again', function () {
    signInAdmin($this);
    browse($this, 'GET', route('v1.me'))->assertJsonPath('data.email', 'root@admin.test')->assertJsonPath('data.is_impersonating', false);

    browse($this, 'POST', route('v1.admin.companies.impersonate', $this->company))
        ->assertOk()
        ->assertJsonPath('data.email', 'owner@acme.test')
        ->assertJsonPath('data.role', 'company')
        ->assertJsonPath('data.is_impersonating', true)
        ->assertJsonPath('data.impersonator', ['name' => 'Root Admin', 'email' => 'root@admin.test']);

    browse($this, 'GET', route('v1.me'))
        ->assertOk()
        ->assertJsonPath('data.email', 'owner@acme.test')
        ->assertJsonPath('data.is_impersonating', true)
        ->assertJsonPath('data.impersonator.email', 'root@admin.test');
    browse($this, 'GET', route('v1.dashboard'))->assertOk(); // company area works

    browse($this, 'POST', route('v1.stop-impersonating'))
        ->assertOk()->assertJsonPath('data.email', 'root@admin.test')->assertJsonPath('data.is_impersonating', false);

    browse($this, 'GET', route('v1.me'))
        ->assertJsonPath('data.role', 'super_admin')
        ->assertJsonPath('data.is_impersonating', false)
        ->assertJsonPath('data.impersonator', null);
    browse($this, 'GET', route('v1.admin.companies.index'))->assertOk(); // admin area works again
});

test('2. the session id is regenerated on start and on stop', function () {
    signInAdmin($this);
    $afterLogin = $this->sessionId;
    browse($this, 'POST', route('v1.admin.companies.impersonate', $this->company))->assertOk();
    $afterStart = $this->sessionId;
    browse($this, 'POST', route('v1.stop-impersonating'))->assertOk();

    expect($afterStart)->not->toBe($afterLogin)->and($this->sessionId)->not->toBe($afterStart);
    expect(DB::table('sessions')->where('id', $afterLogin)->exists())->toBeFalse(); // the old id is gone
});

test('3. who may impersonate whom: company 403, guest 401, super-admin target 404, deleted company 404', function () {
    // A company user.
    browse($this, 'POST', route('v1.auth.login'), ['email' => 'owner@acme.test', 'password' => 'password'])->assertOk();
    $other = Company::factory()->create();
    browse($this, 'POST', route('v1.admin.companies.impersonate', $other))->assertForbidden();

    // A guest.
    $this->sessionId = null;
    browse($this, 'POST', route('v1.admin.companies.impersonate', $other))->assertUnauthorized();

    // An admin targeting another super admin, or a deleted company.
    signInAdmin($this);
    $otherAdmin = User::factory()->superAdmin()->create();
    browse($this, 'POST', route('v1.admin.companies.impersonate', $otherAdmin->id))->assertNotFound();
    $gone = tap(Company::factory()->create())->delete();
    browse($this, 'POST', route('v1.admin.companies.impersonate', $gone->id))->assertNotFound();

    browse($this, 'GET', route('v1.me'))->assertJsonPath('data.email', 'root@admin.test');
    expect(CompanyActivity::where('action', 'impersonated')->count())->toBe(0);
});

test('4. while impersonating, admin routes are 403 — no nesting', function () {
    signInAdmin($this);
    browse($this, 'POST', route('v1.admin.companies.impersonate', $this->company))->assertOk();
    $second = Company::factory()->create();

    browse($this, 'POST', route('v1.admin.companies.impersonate', $second))->assertForbidden();
    browse($this, 'GET', route('v1.admin.companies.index'))->assertForbidden();
    browse($this, 'GET', route('v1.me'))->assertJsonPath('data.email', 'owner@acme.test');
});

test('5. the impersonator cannot be spoofed from the request body', function () {
    $intruder = User::factory()->superAdmin()->create(['email' => 'intruder@admin.test']);
    signInAdmin($this);

    browse($this, 'POST', route('v1.admin.companies.impersonate', $this->company), ['impersonator_id' => $intruder->id, 'impersonator' => ['id' => $intruder->id]])
        ->assertOk()->assertJsonPath('data.impersonator.email', 'root@admin.test');
    browse($this, 'POST', route('v1.stop-impersonating'), ['impersonator_id' => $intruder->id, 'id' => $intruder->id])
        ->assertOk()->assertJsonPath('data.email', 'root@admin.test');
    expect(CompanyActivity::where('action', 'impersonation_ended')->sole()->actor_id)->toBe($this->admin->id);
});

test('6. stop without impersonating → 403 and nothing changes', function () {
    signInAdmin($this);
    browse($this, 'POST', route('v1.stop-impersonating'))->assertForbidden()->assertJsonPath('message', 'You are not viewing as a company.');
    browse($this, 'GET', route('v1.me'))->assertJsonPath('data.email', 'root@admin.test');

    // A company's own session can't "stop" into anyone either.
    $this->sessionId = null;
    browse($this, 'POST', route('v1.auth.login'), ['email' => 'owner@acme.test', 'password' => 'password'])->assertOk();
    browse($this, 'POST', route('v1.stop-impersonating'))->assertForbidden();
    browse($this, 'GET', route('v1.me'))->assertJsonPath('data.email', 'owner@acme.test');
    browse($this, 'POST', route('v1.stop-impersonating'))->assertForbidden();
    expect(CompanyActivity::count())->toBe(0);
});

test('7. a company with login disabled (or inactive) can be impersonated, but still cannot sign in itself', function (string $state) {
    $target = $state === 'login disabled'
        ? Company::factory()->loginDisabled()->create(['email' => 'locked@acme.test'])
        : Company::factory()->inactive()->create(['email' => 'locked@acme.test']);

    signInAdmin($this);
    browse($this, 'POST', route('v1.admin.companies.impersonate', $target))->assertOk()->assertJsonPath('data.email', 'locked@acme.test');
    browse($this, 'POST', route('v1.stop-impersonating'))->assertOk();

    $this->sessionId = null;
    $login = browse($this, 'POST', route('v1.auth.login'), ['email' => 'locked@acme.test', 'password' => 'password']);
    if ($state === 'login disabled') {
        $login->assertForbidden()->assertJsonPath('message', 'Your account is disabled. Contact the administrator.');
    } else {
        $login->assertOk(); // status and login are independent flags (Phase 0 decision B)
    }
})->with(['login disabled', 'inactive']);

test('8. both events are logged on the company, with the admin as actor', function () {
    signInAdmin($this);
    browse($this, 'POST', route('v1.admin.companies.impersonate', $this->company))->assertOk();
    browse($this, 'POST', route('v1.stop-impersonating'))->assertOk();

    $log = CompanyActivity::where('company_id', $this->company->id)->latestFirst()->get();
    expect($log->pluck('action')->all())->toBe([CompanyActivityAction::ImpersonationEnded, CompanyActivityAction::Impersonated])
        ->and($log->pluck('actor_id')->unique()->all())->toBe([$this->admin->id]);

    browse($this, 'GET', route('v1.admin.companies.activities', $this->company))
        ->assertJsonPath('data.0.action_label', 'Returned to admin')
        ->assertJsonPath('data.1.action_label', 'Logged in as company')
        ->assertJsonPath('data.1.actor.email', 'root@admin.test');
});

test('9. the switched session survives later requests (Sanctum password-hash check follows the new user)', function () {
    signInAdmin($this);
    browse($this, 'GET', route('v1.me'))->assertOk(); // stores the admin's password hash in the session
    browse($this, 'POST', route('v1.admin.companies.impersonate', $this->company))->assertOk();

    foreach (range(1, 3) as $i) {
        browse($this, 'GET', route('v1.me'))->assertOk()->assertJsonPath('data.email', 'owner@acme.test');
    }
    browse($this, 'POST', route('v1.stop-impersonating'))->assertOk();
    foreach (range(1, 3) as $i) {
        browse($this, 'GET', route('v1.me'))->assertOk()->assertJsonPath('data.email', 'root@admin.test');
    }
});

test('10. logging out while impersonating ends the whole session', function () {
    signInAdmin($this);
    browse($this, 'POST', route('v1.admin.companies.impersonate', $this->company))->assertOk();

    browse($this, 'POST', route('v1.auth.logout'))->assertNoContent();
    browse($this, 'GET', route('v1.me'))->assertUnauthorized();
    browse($this, 'POST', route('v1.stop-impersonating'))->assertUnauthorized();
});

test('11. if the admin behind the session is deleted meanwhile, stop ends the session', function () {
    signInAdmin($this);
    browse($this, 'POST', route('v1.admin.companies.impersonate', $this->company))->assertOk();
    $this->admin->delete();

    browse($this, 'POST', route('v1.stop-impersonating'))->assertForbidden();
    browse($this, 'GET', route('v1.me'))->assertUnauthorized();
});
