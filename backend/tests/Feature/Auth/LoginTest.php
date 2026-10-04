<?php

use App\Models\User;

test('a company can log in through the company endpoint', function () {
    $company = User::factory()->company()->create();

    $this->postJson(route('v1.auth.login'), ['email' => $company->email, 'password' => 'password'])
        ->assertOk()
        ->assertJsonPath('data.id', $company->id)
        ->assertJsonPath('data.role', 'company');

    $this->assertAuthenticatedAs($company, 'web');
});

test('a company cannot log in through the admin endpoint', function () {
    $company = User::factory()->company()->create();

    $this->postJson(route('v1.admin.auth.login'), ['email' => $company->email, 'password' => 'password'])
        ->assertForbidden()
        ->assertExactJson(['message' => 'These credentials do not match our records.']);

    $this->assertGuest('web');
});

test('a super admin can log in through the admin endpoint', function () {
    $admin = User::factory()->superAdmin()->create();

    $this->postJson(route('v1.admin.auth.login'), ['email' => $admin->email, 'password' => 'password'])
        ->assertOk()
        ->assertJsonPath('data.role', 'super_admin');

    $this->assertAuthenticatedAs($admin, 'web');
});

test('a super admin cannot log in through the company endpoint', function () {
    $admin = User::factory()->superAdmin()->create();

    $this->postJson(route('v1.auth.login'), ['email' => $admin->email, 'password' => 'password'])
        ->assertForbidden()
        ->assertExactJson(['message' => 'These credentials do not match our records.']);

    $this->assertGuest('web');
});

test('a disabled company cannot log in', function () {
    $company = User::factory()->company()->loginDisabled()->create();

    $this->postJson(route('v1.auth.login'), ['email' => $company->email, 'password' => 'password'])
        ->assertForbidden()
        ->assertExactJson(['message' => 'Your account is disabled. Contact the administrator.']);

    $this->assertGuest('web');
});

test('a wrong password returns 422 with an inline email error', function () {
    $company = User::factory()->company()->create();

    $this->postJson(route('v1.auth.login'), ['email' => $company->email, 'password' => 'wrong-password'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email' => 'These credentials do not match our records.']);

    $this->assertGuest('web');
});

test('login requires email and password', function () {
    $this->postJson(route('v1.auth.login'), [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email', 'password']);
});

test('login is rate limited to 5 failed attempts per email and IP', function () {
    $company = User::factory()->company()->create();

    foreach (range(1, 5) as $attempt) {
        $this->postJson(route('v1.auth.login'), ['email' => $company->email, 'password' => 'wrong'])
            ->assertUnprocessable();
    }

    // Locked out — even the correct password is refused now.
    $this->postJson(route('v1.auth.login'), ['email' => $company->email, 'password' => 'password'])
        ->assertTooManyRequests()
        ->assertHeader('Retry-After')
        ->assertJsonPath('message', fn (string $message) => str_starts_with($message, 'Too many login attempts.'));

    $this->assertGuest('web');
});

test('wrong-role attempts count towards the rate limit', function () {
    $company = User::factory()->company()->create();

    foreach (range(1, 5) as $attempt) {
        $this->postJson(route('v1.admin.auth.login'), ['email' => $company->email, 'password' => 'password'])
            ->assertForbidden();
    }

    $this->postJson(route('v1.admin.auth.login'), ['email' => $company->email, 'password' => 'password'])
        ->assertTooManyRequests();
});

test('an authenticated user cannot hit a login endpoint again', function () {
    $company = User::factory()->company()->create();

    $this->actingAs($company, 'web')
        ->postJson(route('v1.auth.login'), ['email' => $company->email, 'password' => 'password'])
        ->assertConflict();
});
