<?php

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
        ]]);
})->with([
    'company' => ['company', 'company'],
    'super admin' => ['superAdmin', 'super_admin'],
]);

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
