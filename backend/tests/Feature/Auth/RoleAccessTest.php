<?php

use App\Models\User;

test('unauthenticated requests get 401', function (string $route) {
    $this->getJson(route($route))
        ->assertUnauthorized()
        ->assertExactJson(['message' => 'Unauthenticated.']);
})->with(['v1.me', 'v1.dashboard', 'v1.admin.dashboard']);

test('a company reaches the company area but not the admin area', function () {
    $this->actingAs(User::factory()->company()->create(), 'web');

    $this->getJson(route('v1.dashboard'))->assertOk();
    $this->getJson(route('v1.admin.dashboard'))
        ->assertForbidden()
        ->assertExactJson(['message' => 'You do not have permission to access this resource.']);
});

test('a super admin reaches the admin area but not the company area', function () {
    $this->actingAs(User::factory()->superAdmin()->create(), 'web');

    $this->getJson(route('v1.admin.dashboard'))->assertOk();
    $this->getJson(route('v1.dashboard'))
        ->assertForbidden()
        ->assertExactJson(['message' => 'You do not have permission to access this resource.']);
});
