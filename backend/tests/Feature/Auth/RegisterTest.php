<?php

use App\Enums\UserType;
use App\Models\User;

$payload = fn (array $overrides = []) => array_merge([
    'name' => 'Acme Ltd',
    'email' => 'owner@acme.test',
    'password' => 'Secret-pass-123',
    'password_confirmation' => 'Secret-pass-123',
], $overrides);

test('a company can register and is logged in', function () use ($payload) {
    $response = $this->postJson(route('v1.auth.register'), $payload());

    $response->assertCreated()
        ->assertJsonPath('data.email', 'owner@acme.test')
        ->assertJsonPath('data.role', 'company')
        ->assertJsonMissingPath('data.password');

    $user = User::where('email', 'owner@acme.test')->sole();
    expect($user->type)->toBe(UserType::Company);
    $this->assertAuthenticatedAs($user, 'web');
});

test('registration ignores a privileged type in the request body', function () use ($payload) {
    $this->postJson(route('v1.auth.register'), $payload([
        'type' => 'super_admin',
        'is_login_enabled' => false,
        'status' => 'inactive',
    ]))->assertCreated()->assertJsonPath('data.role', 'company');

    $user = User::where('email', 'owner@acme.test')->sole();
    expect($user->type)->toBe(UserType::Company)
        ->and($user->is_login_enabled)->toBeTrue()
        ->and($user->status->value)->toBe('active');
});

test('registration validates its input', function () use ($payload) {
    User::factory()->create(['email' => 'taken@acme.test']);

    $this->postJson(route('v1.auth.register'), $payload([
        'name' => '',
        'email' => 'taken@acme.test',
        'password_confirmation' => 'different',
    ]))->assertUnprocessable()->assertJsonValidationErrors(['name', 'email', 'password']);

    $this->assertGuest('web');
});
