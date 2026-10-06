<?php

use App\Models\Plan;
use App\Models\User;

/* /api/v1/admin/plans — Super Admin plan CRUD + toggle-active, and every business rule in
   PlanService. Runs on the isolated sqlite :memory: database. */

beforeEach(function () {
    $this->actingAs(User::factory()->superAdmin()->create(), 'web');
});

function planPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Business',
        'description' => 'For larger teams.',
        'monthly_price' => '29.99',
        'yearly_price' => '299.00',
        'max_projects' => 50,
        'storage_limit_gb' => '10',
        'trial_enabled' => true,
        'trial_days' => 10,
        'ai_integration' => true,
        'is_active' => true,
        'is_default' => false,
    ], $overrides);
}

function subscribe(Plan $plan, int $count): void
{
    User::factory()->company()->count($count)->create()->each(fn (User $user) => $user->forceFill(['plan_id' => $plan->id])->save());
}

// ───────────────────────────── 1–3: create

test('1. creating a plan with full data → 201 and stored exactly', function () {
    $this->postJson(route('v1.admin.plans.store'), planPayload())
        ->assertCreated()
        ->assertJsonPath('data.name', 'Business')
        ->assertJsonPath('data.monthly_price', '29.99')
        ->assertJsonPath('data.yearly_price', '299.00')
        ->assertJsonPath('data.storage_limit_gb', '10.00')
        ->assertJsonPath('data.trial_days', 10)
        ->assertJsonPath('data.ai_integration', true)
        ->assertJsonPath('data.subscribers_count', 0);

    $plan = Plan::sole();
    expect($plan->only(['name', 'monthly_price', 'yearly_price', 'max_projects', 'storage_limit_gb', 'trial_enabled', 'trial_days', 'ai_integration', 'is_active', 'is_default']))
        ->toBe([
            'name' => 'Business', 'monthly_price' => '29.99', 'yearly_price' => '299.00', 'max_projects' => 50,
            'storage_limit_gb' => '10.00', 'trial_enabled' => true, 'trial_days' => 10, 'ai_integration' => true,
            'is_active' => true, 'is_default' => false,
        ]);
});

test('2. an empty yearly price is stored as monthly × 12 × 0.8 (rounded to the cent)', function (?string $yearly, string $monthly, string $expected) {
    $this->postJson(route('v1.admin.plans.store'), planPayload(['monthly_price' => $monthly, 'yearly_price' => $yearly]))
        ->assertCreated()
        ->assertJsonPath('data.yearly_price', $expected);
})->with([
    'null, 19.99' => [null, '19.99', '191.90'],
    'empty string, 49.99' => ['', '49.99', '479.90'],
    'null, 0' => [null, '0', '0.00'],
    'null, 10.01 (96.096 → 96.10)' => [null, '10.01', '96.10'],
]);

test('3. max_projects = -1 round-trips and is flagged unlimited', function () {
    $id = $this->postJson(route('v1.admin.plans.store'), planPayload(['max_projects' => -1]))
        ->assertCreated()
        ->assertJsonPath('data.max_projects', -1)
        ->assertJsonPath('data.is_unlimited', true)
        ->json('data.id');

    $this->getJson(route('v1.admin.plans.show', $id))->assertJsonPath('data.is_unlimited', true);

    $this->postJson(route('v1.admin.plans.store'), planPayload(['name' => 'Bad', 'max_projects' => -2]))
        ->assertUnprocessable()->assertJsonValidationErrors(['max_projects']);
});

test('new plans are appended after existing ones', function () {
    Plan::factory()->create(['sort_order' => 3]);

    $this->postJson(route('v1.admin.plans.store'), planPayload())->assertJsonPath('data.sort_order', 4);
});

// ───────────────────────────── 4–5: validation

test('4. a duplicate name → 422; keeping the same name while updating passes', function () {
    $plan = Plan::factory()->create(['name' => 'Starter']);

    $this->postJson(route('v1.admin.plans.store'), planPayload(['name' => 'Starter']))
        ->assertUnprocessable()->assertJsonValidationErrors(['name']);

    $this->putJson(route('v1.admin.plans.update', $plan), planPayload(['name' => 'Starter']))
        ->assertOk()->assertJsonPath('data.name', 'Starter');
});

test('a soft-deleted plan keeps its name reserved', function () {
    Plan::factory()->create(['name' => 'Legacy'])->delete();

    $this->postJson(route('v1.admin.plans.store'), planPayload(['name' => 'Legacy']))
        ->assertUnprocessable()->assertJsonValidationErrors(['name']);
});

test('5. trial enabled with 0 days → 422; trial disabled stores 0 days', function () {
    $this->postJson(route('v1.admin.plans.store'), planPayload(['trial_enabled' => true, 'trial_days' => 0]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['trial_days' => 'Trial days must be at least 1 when the trial is enabled.']);

    $this->postJson(route('v1.admin.plans.store'), planPayload(['trial_enabled' => false, 'trial_days' => 30]))
        ->assertCreated()
        ->assertJsonPath('data.trial_days', 0);
});

test('field validation: required fields, negatives, more than 2 decimals, long description', function () {
    $this->postJson(route('v1.admin.plans.store'), [])
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['name', 'monthly_price', 'max_projects', 'storage_limit_gb']);

    $this->postJson(route('v1.admin.plans.store'), planPayload([
        'monthly_price' => '-1', 'yearly_price' => '1.999', 'storage_limit_gb' => '-0.5', 'description' => str_repeat('a', 1001),
    ]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['monthly_price', 'yearly_price', 'storage_limit_gb', 'description']);
});

// ───────────────────────────── 6–9: default plan + subscribers

test('6. making plan B the default unsets plan A — exactly one default afterwards', function () {
    $a = Plan::factory()->default()->create();
    $b = Plan::factory()->inactive()->create();

    $this->putJson(route('v1.admin.plans.update', $b), planPayload(['name' => $b->name, 'is_default' => true, 'is_active' => false]))
        ->assertOk()
        ->assertJsonPath('data.is_default', true)
        ->assertJsonPath('data.is_active', true); // a default plan is always active

    expect($a->fresh()->is_default)->toBeFalse()
        ->and(Plan::where('is_default', true)->pluck('id')->all())->toBe([$b->id]);

    // Creating a new default plan switches it again.
    $id = $this->postJson(route('v1.admin.plans.store'), planPayload(['name' => 'Newest', 'is_default' => true]))->json('data.id');
    expect(Plan::where('is_default', true)->pluck('id')->all())->toBe([$id]);
});

test('the current default cannot simply be un-defaulted (another plan must take over)', function () {
    $default = Plan::factory()->default()->create();

    $this->putJson(route('v1.admin.plans.update', $default), planPayload(['name' => $default->name, 'is_default' => false]))
        ->assertUnprocessable()->assertJsonValidationErrors(['is_default']);

    expect($default->fresh()->is_default)->toBeTrue();
});

test('7. deactivating the default plan → 422 (via toggle and via update)', function () {
    $default = Plan::factory()->default()->create();

    $this->patchJson(route('v1.admin.plans.toggle-active', $default))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['is_active' => 'The default plan cannot be deactivated.']);

    $this->putJson(route('v1.admin.plans.update', $default), planPayload(['name' => $default->name, 'is_default' => true, 'is_active' => false]))
        ->assertUnprocessable()->assertJsonValidationErrors(['is_active']);

    expect($default->fresh()->is_active)->toBeTrue();
});

test('8. deleting the default plan → 422', function () {
    $default = Plan::factory()->default()->create();

    $this->deleteJson(route('v1.admin.plans.destroy', $default))
        ->assertUnprocessable()->assertJsonValidationErrors(['plan']);

    expect(Plan::find($default->id))->not->toBeNull();
});

test('9. deleting a plan with subscribers → 422 naming the count', function (int $count, string $message) {
    $plan = Plan::factory()->create();
    subscribe($plan, $count);

    $this->deleteJson(route('v1.admin.plans.destroy', $plan))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['plan' => $message]);

    expect(Plan::find($plan->id))->not->toBeNull();
    $this->getJson(route('v1.admin.plans.index'))->assertJsonPath('data.0.subscribers_count', $count);
})->with([
    'one' => [1, 'This plan has 1 subscriber, so it cannot be deleted. Deactivate it instead.'],
    'three' => [3, 'This plan has 3 subscribers, so it cannot be deleted. Deactivate it instead.'],
]);

test('a plan with subscribers can still be deactivated', function () {
    $plan = Plan::factory()->create();
    subscribe($plan, 2);

    $this->patchJson(route('v1.admin.plans.toggle-active', $plan))->assertOk()->assertJsonPath('data.is_active', false);
});

// ───────────────────────────── 10–11: delete + toggle

test('10. deleting an unused, non-default plan → 204 and soft-deleted', function () {
    $plan = Plan::factory()->create();

    $this->deleteJson(route('v1.admin.plans.destroy', $plan))->assertNoContent();

    expect(Plan::find($plan->id))->toBeNull()
        ->and(Plan::withTrashed()->find($plan->id)->trashed())->toBeTrue();
    $this->getJson(route('v1.admin.plans.show', $plan->id))->assertNotFound();
    $this->getJson(route('v1.admin.plans.index'))->assertJsonCount(0, 'data');
});

test('11. toggle-active flips the flag both ways and persists', function () {
    $plan = Plan::factory()->create(['is_active' => true]);

    $this->patchJson(route('v1.admin.plans.toggle-active', $plan))->assertOk()->assertJsonPath('data.is_active', false);
    expect($plan->fresh()->is_active)->toBeFalse();

    $this->patchJson(route('v1.admin.plans.toggle-active', $plan))->assertOk()->assertJsonPath('data.is_active', true);
    expect($plan->fresh()->is_active)->toBeTrue();
});

// ───────────────────────────── read

test('index lists every plan ordered by sort_order then id, with counts', function () {
    $third = Plan::factory()->create(['name' => 'C', 'sort_order' => 2]);
    $first = Plan::factory()->create(['name' => 'A', 'sort_order' => 1]);
    $second = Plan::factory()->create(['name' => 'B', 'sort_order' => 1]);

    $this->getJson(route('v1.admin.plans.index'))
        ->assertOk()
        ->assertJsonPath('data.*.id', [$first->id, $second->id, $third->id])
        ->assertJsonStructure(['data' => [['id', 'name', 'monthly_price', 'yearly_price', 'max_projects', 'is_unlimited', 'storage_limit_gb', 'trial_enabled', 'trial_days', 'ai_integration', 'is_active', 'is_default', 'is_recommended', 'sort_order', 'subscribers_count']]]);
});

test('update changes the plan and returns it', function () {
    $plan = Plan::factory()->create(['name' => 'Old']);

    $this->putJson(route('v1.admin.plans.update', $plan), planPayload(['name' => 'New', 'monthly_price' => '5', 'yearly_price' => null]))
        ->assertOk()
        ->assertJsonPath('data.name', 'New')
        ->assertJsonPath('data.monthly_price', '5.00')
        ->assertJsonPath('data.yearly_price', '48.00');
});

// ───────────────────────────── 12: access

test('12a. a company user gets 403 on every plan route', function (string $method, string $route, bool $needsPlan) {
    $plan = Plan::factory()->create();
    $this->actingAs(User::factory()->company()->create(), 'web');

    $this->json($method, route($route, $needsPlan ? $plan : []), planPayload())
        ->assertForbidden();

    expect(Plan::find($plan->id))->not->toBeNull();
})->with('plan routes');

test('12b. unauthenticated requests get 401 on every plan route', function (string $method, string $route, bool $needsPlan) {
    $plan = Plan::factory()->create();
    auth()->guard('web')->logout();

    $this->json($method, route($route, $needsPlan ? $plan : []), planPayload())
        ->assertUnauthorized();
})->with('plan routes');

dataset('plan routes', [
    'index' => ['GET', 'v1.admin.plans.index', false],
    'store' => ['POST', 'v1.admin.plans.store', false],
    'show' => ['GET', 'v1.admin.plans.show', true],
    'update' => ['PUT', 'v1.admin.plans.update', true],
    'destroy' => ['DELETE', 'v1.admin.plans.destroy', true],
    'toggle-active' => ['PATCH', 'v1.admin.plans.toggle-active', true],
]);
