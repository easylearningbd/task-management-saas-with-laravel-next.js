<?php

use App\Models\Plan;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

test('me returns the authenticated user and role without secrets', function (string $state, string $role) {
    $user = User::factory()->{$state}()->create();

    $this->actingAs($user, 'web')
        ->getJson(route('v1.me'))
        ->assertOk()
        ->assertExactJson(['data' => [
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'role' => $role,
            'avatar' => null,
            'status' => 'active',
            'is_impersonating' => false,
            'impersonator' => null,
            'plan' => null, // no plan assigned to this factory user (see the next test)
        ]]);
})->with([
    'company' => ['company', 'company'],
    'super admin' => ['superAdmin', 'super_admin'],
]);

test('me carries a company\'s current plan (Billing decision 1) — never a super admin\'s', function () {
    $plan = Plan::factory()->create(['name' => 'Growth']);
    $company = User::factory()->company()->create();
    $company->forceFill(['plan_id' => $plan->id, 'plan_duration' => 'yearly'])->save();
    $admin = User::factory()->superAdmin()->create();
    $admin->forceFill(['plan_id' => $plan->id])->save();

    $this->actingAs($company, 'web')->getJson(route('v1.me'))
        ->assertJsonPath('data.plan', ['id' => $plan->id, 'name' => 'Growth', 'duration' => 'yearly']);
    Auth::forgetGuards();
    $this->actingAs($admin, 'web')->getJson(route('v1.me'))->assertJsonPath('data.plan', null);
});

test('logout ends the session for both roles', function (string $state, string $loginRoute) {
    $user = User::factory()->{$state}()->create();

    $this->postJson(route($loginRoute), ['email' => $user->email, 'password' => 'password'])->assertOk();
    $this->getJson(route('v1.me'))->assertOk();

    $session = app('session.store');
    $sessionId = $session->getId();
    $csrfToken = $session->token();

    $this->postJson(route('v1.auth.logout'))->assertNoContent();

    $this->assertGuest('web');
    expect($session->getId())->not->toBe($sessionId)   // session invalidated
        ->and($session->token())->not->toBe($csrfToken); // CSRF token regenerated

    // The next HTTP request is a fresh one: drop the guards' per-request user cache.
    Auth::forgetGuards();

    $this->getJson(route('v1.me'))->assertUnauthorized();
})->with([
    'company' => ['company', 'v1.auth.login'],
    'super admin' => ['superAdmin', 'v1.admin.auth.login'],
]);

test('logout requires authentication', function () {
    $this->postJson(route('v1.auth.logout'))->assertUnauthorized();
});
