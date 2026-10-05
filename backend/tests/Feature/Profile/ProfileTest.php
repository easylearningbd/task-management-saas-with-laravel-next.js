<?php

use App\Enums\UserType;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

/* GET|PATCH /api/v1/profile, POST /api/v1/profile/avatar, PUT /api/v1/profile/password.
   Both roles may use them; each only ever touches the signed-in user's own record. */

$roles = ['company' => ['company'], 'super admin' => ['superAdmin']];

// ───────────────────────────── profile

test('show returns the signed-in user without secrets', function () {
    $admin = User::factory()->superAdmin()->create();

    $this->actingAs($admin, 'web')
        ->getJson(route('v1.profile.show'))
        ->assertOk()
        ->assertJsonPath('data.id', $admin->id)
        ->assertJsonPath('data.role', 'super_admin')
        ->assertJsonMissingPath('data.password');
});

test('a user updates their name and email', function (string $state) {
    $user = User::factory()->{$state}()->create();

    $this->actingAs($user, 'web')
        ->patchJson(route('v1.profile.update'), ['name' => 'New Name', 'email' => 'New.Address@Example.com'])
        ->assertOk()
        ->assertJsonPath('data.name', 'New Name')
        ->assertJsonPath('data.email', 'new.address@example.com');

    expect($user->fresh())
        ->name->toBe('New Name')
        ->email->toBe('new.address@example.com')
        ->email_verified_at->toBeNull(); // a changed address is no longer verified
})->with($roles);

test('an email already used by another account is rejected', function () {
    User::factory()->create(['email' => 'taken@example.com']);
    $user = User::factory()->superAdmin()->create();

    $this->actingAs($user, 'web')
        ->patchJson(route('v1.profile.update'), ['name' => 'Admin', 'email' => 'taken@example.com'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});

test('keeping your own email passes and keeps it verified', function () {
    $user = User::factory()->superAdmin()->create(['email' => 'me@example.com']);

    $this->actingAs($user, 'web')
        ->patchJson(route('v1.profile.update'), ['name' => 'Renamed', 'email' => 'me@example.com'])
        ->assertOk();

    expect($user->fresh()->email_verified_at)->not->toBeNull();
});

test('profile validation: name and email are required, email must be valid and ≤ 255', function () {
    $user = User::factory()->superAdmin()->create();

    $this->actingAs($user, 'web')
        ->patchJson(route('v1.profile.update'), ['name' => '', 'email' => 'not-an-email'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['name', 'email']);

    $this->patchJson(route('v1.profile.update'), ['name' => str_repeat('a', 256), 'email' => str_repeat('a', 250).'@x.com'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['name', 'email']);
});

test('the payload cannot escalate privileges or touch other columns', function () {
    $company = User::factory()->company()->create();

    $this->actingAs($company, 'web')
        ->patchJson(route('v1.profile.update'), [
            'name' => 'Still A Company',
            'email' => $company->email,
            'type' => 'super_admin',
            'is_login_enabled' => false,
            'status' => 'inactive',
            'avatar' => 'avatars/someone-else.png',
            'id' => 999,
        ])
        ->assertOk()
        ->assertJsonPath('data.role', 'company');

    $fresh = $company->fresh();
    expect($fresh->type)->toBe(UserType::Company)
        ->and($fresh->is_login_enabled)->toBeTrue()
        ->and($fresh->status->value)->toBe('active')
        ->and($fresh->avatar)->toBeNull()
        ->and($fresh->id)->toBe($company->id);
});

test('a company user can only change their own record', function () {
    $company = User::factory()->company()->create();
    $other = User::factory()->company()->create(['name' => 'Untouched']);

    $this->actingAs($company, 'web')
        ->patchJson(route('v1.profile.update'), ['name' => 'Mine', 'email' => $company->email, 'id' => $other->id])
        ->assertOk();

    expect($other->fresh()->name)->toBe('Untouched');
});

// ───────────────────────────── avatar

test('uploading a 1 MB PNG stores it on the public disk and returns its URL', function () {
    Storage::fake('public');
    $user = User::factory()->superAdmin()->create();

    $response = $this->actingAs($user, 'web')
        ->post(route('v1.profile.avatar'), ['avatar' => UploadedFile::fake()->image('me.png', 400, 400)->size(1024)], ['Accept' => 'application/json'])
        ->assertOk();

    $path = $user->fresh()->avatar;
    expect($path)->toStartWith('avatars/');
    Storage::disk('public')->assertExists($path);
    $response->assertJsonPath('data.avatar', Storage::disk('public')->url($path));
});

test('replacing the avatar deletes the previous file', function () {
    Storage::fake('public');
    $user = User::factory()->superAdmin()->create();
    $this->actingAs($user, 'web');

    $this->post(route('v1.profile.avatar'), ['avatar' => UploadedFile::fake()->image('one.jpg')], ['Accept' => 'application/json'])->assertOk();
    $first = $user->fresh()->avatar;

    $this->post(route('v1.profile.avatar'), ['avatar' => UploadedFile::fake()->image('two.gif')], ['Accept' => 'application/json'])->assertOk();
    $second = $user->fresh()->avatar;

    expect($second)->not->toBe($first);
    Storage::disk('public')->assertMissing($first);
    Storage::disk('public')->assertExists($second);
});

test('avatar over 2 MB, a PDF, or no file is rejected', function (Closure $file) {
    Storage::fake('public');
    $user = User::factory()->superAdmin()->create();

    $this->actingAs($user, 'web')
        ->post(route('v1.profile.avatar'), ['avatar' => $file()], ['Accept' => 'application/json'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['avatar']);

    expect($user->fresh()->avatar)->toBeNull();
    expect(Storage::disk('public')->allFiles())->toBeEmpty();
})->with([
    'over 2 MB' => [fn () => UploadedFile::fake()->image('big.png')->size(2049)],
    'pdf' => [fn () => UploadedFile::fake()->create('doc.pdf', 100, 'application/pdf')],
    'missing' => [fn () => null],
]);

// ───────────────────────────── password

test('password update with the right current password → 204, and the new password works', function () {
    $user = User::factory()->superAdmin()->create(); // factory password: "password"

    $this->actingAs($user, 'web')
        ->putJson(route('v1.profile.password'), [
            'current_password' => 'password',
            'password' => 'Brand-new-pass-1',
            'password_confirmation' => 'Brand-new-pass-1',
        ])
        ->assertNoContent();

    expect(Hash::check('Brand-new-pass-1', $user->fresh()->password))->toBeTrue();

    // The current session stays signed in (Sanctum re-stores this session's password hash).
    $this->getJson(route('v1.me'))->assertOk();

    // A fresh login with the new password succeeds; the old one fails.
    $this->postJson(route('v1.auth.logout'))->assertNoContent();
    Auth::forgetGuards();
    $this->postJson(route('v1.admin.auth.login'), ['email' => $user->email, 'password' => 'password'])->assertUnprocessable();
    $this->postJson(route('v1.admin.auth.login'), ['email' => $user->email, 'password' => 'Brand-new-pass-1'])->assertOk();
});

test('a wrong current password → 422 under current_password, password unchanged', function () {
    $user = User::factory()->company()->create();

    $this->actingAs($user, 'web')
        ->putJson(route('v1.profile.password'), [
            'current_password' => 'not-my-password',
            'password' => 'Brand-new-pass-1',
            'password_confirmation' => 'Brand-new-pass-1',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['current_password'])
        ->assertJsonMissingValidationErrors(['password']);

    expect(Hash::check('password', $user->fresh()->password))->toBeTrue();
});

test('the new password must be confirmed, meet the defaults and differ from the current one', function () {
    $user = User::factory()->company()->create();
    $this->actingAs($user, 'web');

    $this->putJson(route('v1.profile.password'), ['current_password' => 'password', 'password' => 'short', 'password_confirmation' => 'short'])
        ->assertUnprocessable()->assertJsonValidationErrors(['password']);

    $this->putJson(route('v1.profile.password'), ['current_password' => 'password', 'password' => 'Brand-new-pass-1', 'password_confirmation' => 'different-1'])
        ->assertUnprocessable()->assertJsonValidationErrors(['password']);

    $this->putJson(route('v1.profile.password'), ['current_password' => 'password', 'password' => 'password', 'password_confirmation' => 'password'])
        ->assertUnprocessable()->assertJsonValidationErrors(['password']);
});

// ───────────────────────────── access

test('all four profile routes require authentication', function (string $method, string $route) {
    $this->json($method, route($route))
        ->assertUnauthorized()
        ->assertExactJson(['message' => 'Unauthenticated.']);
})->with([
    'show' => ['GET', 'v1.profile.show'],
    'update' => ['PATCH', 'v1.profile.update'],
    'avatar' => ['POST', 'v1.profile.avatar'],
    'password' => ['PUT', 'v1.profile.password'],
]);
