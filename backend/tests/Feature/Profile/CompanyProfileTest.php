<?php

use App\Enums\PlanDuration;
use App\Enums\UserType;
use App\Models\Company;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;

/* The own-profile endpoints from a COMPANY account (the company Profile Settings page, /profile).
   Same role-neutral routes as the Super Admin page — GET|PATCH /api/v1/profile,
   POST /api/v1/profile/avatar, PUT /api/v1/profile/password — and each one must only ever
   touch the signed-in company's own name, email, avatar and password.
   ProfileTest.php (both roles) is left as it was. */

/** A company on a paid plan, as a plain User — the class the auth guard resolves. */
function companyOnPlan(): User
{
    $plan = Plan::factory()->create(['name' => 'Starter']);
    $company = Company::factory()->onPlan($plan, PlanDuration::Monthly)->create();

    return User::findOrFail($company->id);
}

// ───────────────────────────── 1. show

test('1. GET /profile returns the company its own data and never a password hash', function () {
    $company = User::factory()->company()->create(['name' => 'Acme Ltd']);
    User::factory()->company()->create(['name' => 'Someone Else']);

    $this->actingAs($company, 'web')
        ->getJson(route('v1.profile.show'))
        ->assertOk()
        ->assertJsonPath('data.id', $company->id)
        ->assertJsonPath('data.name', 'Acme Ltd')
        ->assertJsonPath('data.email', $company->email)
        ->assertJsonPath('data.role', 'company')
        ->assertJsonMissingPath('data.password')
        ->assertJsonMissingPath('data.remember_token')
        ->assertDontSee($company->password, false);
});

// ───────────────────────────── 2–6. profile

test('2. PATCH /profile updates the company name and email', function () {
    $company = User::factory()->company()->create();

    $this->actingAs($company, 'web')
        ->patchJson(route('v1.profile.update'), ['name' => 'Acme Renamed', 'email' => 'Billing@Acme.test'])
        ->assertOk()
        ->assertJsonPath('data.name', 'Acme Renamed')
        ->assertJsonPath('data.email', 'billing@acme.test');

    expect($company->fresh())
        ->name->toBe('Acme Renamed')
        ->email->toBe('billing@acme.test');
});

test('3. an email already used by another user is rejected', function (Closure $owner) {
    $taken = $owner();
    $company = User::factory()->company()->create();

    $this->actingAs($company, 'web')
        ->patchJson(route('v1.profile.update'), ['name' => 'Acme', 'email' => strtoupper($taken->email)])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email'])
        ->assertJsonMissingValidationErrors(['name']);

    expect($company->fresh()->email)->not->toBe($taken->email);
})->with([
    'another company' => [fn () => User::factory()->company()->create()],
    'the super admin' => [fn () => User::factory()->superAdmin()->create()],
]);

test('4. keeping its own email passes', function () {
    $company = User::factory()->company()->create(['email' => 'owner@acme.test']);

    $this->actingAs($company, 'web')
        ->patchJson(route('v1.profile.update'), ['name' => 'Acme', 'email' => 'owner@acme.test'])
        ->assertOk()
        ->assertJsonPath('data.email', 'owner@acme.test');

    expect($company->fresh()->email_verified_at)->not->toBeNull();
});

test('5. type, login, status and subscription fields in the payload are ignored', function () {
    $company = companyOnPlan();
    $before = $company->only(['type', 'is_login_enabled', 'status', 'plan_id', 'plan_duration', 'plan_expires_at', 'trial_ends_at']);
    $otherPlan = Plan::factory()->create(['name' => 'Pro']);

    $this->actingAs($company, 'web')
        ->patchJson(route('v1.profile.update'), [
            'name' => 'Valid Name',
            'email' => $company->email,
            'type' => 'super_admin',
            'role' => 'super_admin',
            'is_login_enabled' => false,
            'status' => 'inactive',
            'plan_id' => $otherPlan->id,
            'plan_duration' => 'yearly',
            'plan_expires_at' => '2099-12-31 23:59:59',
            'trial_ends_at' => '2099-12-31 23:59:59',
            'password' => 'Sneaky-pass-123',
        ])
        ->assertOk()
        ->assertJsonPath('data.role', 'company');

    $fresh = $company->fresh();
    expect($fresh->name)->toBe('Valid Name')
        ->and($fresh->type)->toBe(UserType::Company)
        ->and($fresh->only(array_keys($before)))->toEqual($before)
        ->and(Hash::check('password', $fresh->password))->toBeTrue(); // password only via PUT /profile/password
});

test('6. an id in the body still only updates the authenticated company', function (Closure $target) {
    $company = User::factory()->company()->create(['name' => 'Mine']);
    $other = $target();
    $otherBefore = $other->only(['name', 'email', 'type', 'status', 'is_login_enabled']);

    $this->actingAs($company, 'web')
        ->patchJson(route('v1.profile.update'), ['id' => $other->id, 'name' => 'Changed', 'email' => 'changed@acme.test'])
        ->assertOk()
        ->assertJsonPath('data.id', $company->id);

    expect($company->fresh()->name)->toBe('Changed')
        ->and($other->fresh()->only(array_keys($otherBefore)))->toEqual($otherBefore);
})->with([
    'another company' => [fn () => User::factory()->company()->create(['name' => 'Untouched'])],
    'the super admin' => [fn () => User::factory()->superAdmin()->create(['name' => 'Untouched Admin'])],
]);

// ───────────────────────────── 7–9. avatar

test('7. a 1 MB PNG avatar is stored on the public disk and the column updated', function () {
    Storage::fake('public');
    $company = User::factory()->company()->create();

    $response = $this->actingAs($company, 'web')
        ->post(route('v1.profile.avatar'), ['avatar' => UploadedFile::fake()->image('logo.png', 400, 400)->size(1024)], ['Accept' => 'application/json'])
        ->assertOk()
        ->assertJsonPath('data.id', $company->id);

    $path = $company->fresh()->avatar;
    expect($path)->toStartWith('avatars/');
    Storage::disk('public')->assertExists($path);
    $response->assertJsonPath('data.avatar', Storage::disk('public')->url($path));
});

test('8. an avatar over 2 MB or a PDF is rejected', function (Closure $file) {
    Storage::fake('public');
    $company = User::factory()->company()->create();

    $this->actingAs($company, 'web')
        ->post(route('v1.profile.avatar'), ['avatar' => $file()], ['Accept' => 'application/json'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['avatar']);

    expect($company->fresh()->avatar)->toBeNull()
        ->and(Storage::disk('public')->allFiles())->toBeEmpty();
})->with([
    'over 2 MB' => [fn () => UploadedFile::fake()->image('big.png')->size(2049)],
    'pdf' => [fn () => UploadedFile::fake()->create('logo.pdf', 100, 'application/pdf')],
]);

test('9. a second avatar replaces the first and removes the old file', function () {
    Storage::fake('public');
    $company = User::factory()->company()->create();
    $this->actingAs($company, 'web');

    $this->post(route('v1.profile.avatar'), ['avatar' => UploadedFile::fake()->image('one.png')], ['Accept' => 'application/json'])->assertOk();
    $first = $company->fresh()->avatar;

    $this->post(route('v1.profile.avatar'), ['avatar' => UploadedFile::fake()->image('two.jpg')], ['Accept' => 'application/json'])->assertOk();
    $second = $company->fresh()->avatar;

    expect($second)->not->toBe($first);
    Storage::disk('public')->assertMissing($first);
    Storage::disk('public')->assertExists($second);
    expect(Storage::disk('public')->allFiles())->toHaveCount(1);
});

// ───────────────────────────── 10–12. password

test('10. the right current password → 204, and the new password signs in at the company login', function () {
    $company = User::factory()->company()->create(); // factory password: "password"

    $this->actingAs($company, 'web')
        ->putJson(route('v1.profile.password'), [
            'current_password' => 'password',
            'password' => 'Company-new-pass-1',
            'password_confirmation' => 'Company-new-pass-1',
        ])
        ->assertNoContent();

    expect(Hash::check('Company-new-pass-1', $company->fresh()->password))->toBeTrue();

    $this->postJson(route('v1.auth.logout'))->assertNoContent();
    Auth::forgetGuards();

    $this->postJson(route('v1.auth.login'), ['email' => $company->email, 'password' => 'password'])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
    $this->postJson(route('v1.auth.login'), ['email' => $company->email, 'password' => 'Company-new-pass-1'])
        ->assertOk();
    $this->getJson(route('v1.me'))->assertOk()->assertJsonPath('data.id', $company->id);
});

test('11. a wrong current password → 422 under current_password, password unchanged', function () {
    $company = User::factory()->company()->create();

    $this->actingAs($company, 'web')
        ->putJson(route('v1.profile.password'), [
            'current_password' => 'not-the-password',
            'password' => 'Company-new-pass-1',
            'password_confirmation' => 'Company-new-pass-1',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['current_password'])
        ->assertJsonMissingValidationErrors(['password']);

    expect(Hash::check('password', $company->fresh()->password))->toBeTrue();
});

test('12. a new password identical to the current one → 422', function () {
    $company = User::factory()->company()->create();

    $this->actingAs($company, 'web')
        ->putJson(route('v1.profile.password'), [
            'current_password' => 'password',
            'password' => 'password',
            'password_confirmation' => 'password',
        ])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['password']);

    expect(Hash::check('password', $company->fresh()->password))->toBeTrue();
});

// ───────────────────────────── 13. access

test('13. all four routes return 401 without a session', function (string $method, string $route) {
    User::factory()->company()->create();

    $this->json($method, route($route), ['name' => 'X', 'email' => 'x@example.com'])
        ->assertUnauthorized();
})->with([
    'show' => ['GET', 'v1.profile.show'],
    'update' => ['PATCH', 'v1.profile.update'],
    'avatar' => ['POST', 'v1.profile.avatar'],
    'password' => ['PUT', 'v1.profile.password'],
]);
