<?php

use App\Exceptions\PlanLimitReached;
use App\Models\Client;
use App\Models\Media;
use App\Models\Plan;
use App\Models\Project;
use App\Models\User;
use App\Services\PlanLimitService;
use App\Support\Tenancy\Tenancy;
use Illuminate\Support\Facades\Auth;

/* PlanLimitService through the API: the project limit on POST /projects (storage uploads are
   covered with the media endpoints in Phase 5), the fallback to the default plan, and
   GET /plan-usage. */

beforeEach(function () {
    $this->company = User::factory()->company()->create();
    $this->other = User::factory()->company()->create();
    $this->client = Tenancy::instance()->runAs($this->company, fn () => Client::factory()->create());
});

function onPlan(User $company, ?Plan $plan): void
{
    $company->forceFill(['plan_id' => $plan?->id])->save();
}

function actAsLimitedUser(User $user): void
{
    test()->flushSession();
    Auth::forgetGuards();
    test()->actingAs($user, 'web');
}

function newProjectPayload(int $clientId, string $name = 'New Project'): array
{
    return ['name' => $name, 'client_id' => $clientId, 'start_date' => '2026-01-01', 'end_date' => '2026-02-01', 'budget' => '1000'];
}

const LIMIT_MESSAGE = 'You\'ve reached your plan\'s project limit. Upgrade to add more.';

test('the plan\'s max_projects blocks the n+1th create with the exact code, message and numbers; edits still succeed', function () {
    onPlan($this->company, Plan::factory()->create(['max_projects' => 3]));
    actAsLimitedUser($this->company);

    for ($i = 1; $i <= 3; $i++) {
        $this->postJson(route('v1.projects.store'), newProjectPayload($this->client->id, "P$i"))->assertCreated();
    }

    $this->postJson(route('v1.projects.store'), newProjectPayload($this->client->id, 'P4'))
        ->assertUnprocessable()
        ->assertExactJson([
            'message' => LIMIT_MESSAGE,
            'code' => 'plan_limit_reached',
            'limit' => 3,
            'current' => 3,
            'errors' => ['project' => [LIMIT_MESSAGE]],
        ]);
    expect(DB::table('projects')->count())->toBe(3);

    $first = DB::table('projects')->orderBy('id')->value('id');
    $this->putJson(route('v1.projects.update', $first), newProjectPayload($this->client->id, 'Edited at the limit'))->assertOk();
    $this->patchJson(route('v1.projects.toggle-status', $first))->assertOk();
});

test('-1 means unlimited', function () {
    onPlan($this->company, Plan::factory()->create(['max_projects' => Plan::UNLIMITED]));
    actAsLimitedUser($this->company);

    for ($i = 1; $i <= 6; $i++) {
        $this->postJson(route('v1.projects.store'), newProjectPayload($this->client->id, "P$i"))->assertCreated();
    }
});

test('the limit counts only this company\'s live projects: another company\'s don\'t count, and deleting one frees a slot', function () {
    onPlan($this->company, Plan::factory()->create(['max_projects' => 1]));
    Tenancy::instance()->runAs($this->other, fn () => Project::factory()->count(5)->create());
    actAsLimitedUser($this->company);

    $id = $this->postJson(route('v1.projects.store'), newProjectPayload($this->client->id))->assertCreated()->json('data.id');
    $this->postJson(route('v1.projects.store'), newProjectPayload($this->client->id))->assertUnprocessable()->assertJsonPath('code', 'plan_limit_reached');

    $this->deleteJson(route('v1.projects.destroy', $id))->assertNoContent();
    $this->postJson(route('v1.projects.store'), newProjectPayload($this->client->id))->assertCreated();
});

test('a limit of 0 blocks the first project', function () {
    onPlan($this->company, Plan::factory()->create(['max_projects' => 0]));
    actAsLimitedUser($this->company);

    $this->postJson(route('v1.projects.store'), newProjectPayload($this->client->id))
        ->assertUnprocessable()->assertJsonPath('limit', 0)->assertJsonPath('current', 0);
});

test('a company without a plan gets the default plan\'s limits — never unlimited; with no default plan at all it gets none', function () {
    onPlan($this->company, null);
    Plan::factory()->default()->create(['max_projects' => 2]);
    actAsLimitedUser($this->company);

    $this->postJson(route('v1.projects.store'), newProjectPayload($this->client->id))->assertCreated();
    $this->postJson(route('v1.projects.store'), newProjectPayload($this->client->id))->assertCreated();
    $this->postJson(route('v1.projects.store'), newProjectPayload($this->client->id))->assertUnprocessable()->assertJsonPath('limit', 2);

    DB::table('plans')->update(['is_default' => false]);
    $this->postJson(route('v1.projects.store'), newProjectPayload($this->client->id))->assertUnprocessable()->assertJsonPath('limit', 0);
});

test('plan-usage reports the plan and the usage against the allowance', function () {
    onPlan($this->company, Plan::factory()->create(['name' => 'Free', 'max_projects' => 3, 'storage_limit_gb' => '1.00', 'ai_integration' => false]));
    Tenancy::instance()->runAs($this->company, function () {
        Project::factory()->count(2)->create();
        Media::factory()->create(['size_bytes' => 1500]);
        Media::factory()->create(['size_bytes' => 500]);
    });
    Tenancy::instance()->runAs($this->other, fn () => Media::factory()->create(['size_bytes' => 999999]));
    actAsLimitedUser($this->company);

    $this->getJson(route('v1.plan-usage'))->assertOk()->assertExactJson(['data' => [
        'plan' => ['id' => $this->company->refresh()->plan_id, 'name' => 'Free'],
        'projects' => ['used' => 2, 'limit' => 3],
        'storage' => ['used_bytes' => 2000, 'limit_bytes' => 1073741824],
        'ai_integration' => false,
    ]]);
});

test('ensureCanStore: within the allowance passes; one byte over → storage_limit_reached with the numbers', function () {
    onPlan($this->company, Plan::factory()->create(['storage_limit_gb' => '0.01'])); // 10,737,418 bytes
    Tenancy::instance()->runAs($this->company, function () {
        Media::factory()->create(['size_bytes' => 10737400]);
        $limits = app(PlanLimitService::class);

        $limits->ensureCanStore(18); // exactly at the allowance

        try {
            $limits->ensureCanStore(19);
            $this->fail('one byte over was allowed');
        } catch (PlanLimitReached $e) {
            $body = json_decode($e->render()->getContent(), true);
            expect($e->render()->getStatusCode())->toBe(422)
                ->and($body['code'])->toBe('storage_limit_reached')
                ->and([$body['limit_bytes'], $body['used_bytes'], $body['file_bytes']])->toBe([10737418, 10737400, 19])
                ->and($body['errors'])->toHaveKey('file');
        }
    });
});

test('plan-usage is company-only: a guest gets 401, a super admin 403', function () {
    $this->getJson(route('v1.plan-usage'))->assertUnauthorized();
    actAsLimitedUser(User::factory()->superAdmin()->create());
    $this->getJson(route('v1.plan-usage'))->assertForbidden();
});
