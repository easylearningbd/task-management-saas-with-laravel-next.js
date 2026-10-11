<?php

use App\Models\Plan;
use App\Models\Project;
use App\Models\User;
use App\Support\Tenancy\Tenancy;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

/* Billing Phase 3, test 11 — `plans:expire`: an expired plan or an ended trial goes back to the
   default plan (monthly, no expiry), the company's data stays, and a second run changes nothing. */

beforeEach(function () {
    Carbon::setTestNow('2026-10-12 12:00:00');
    $this->free = Plan::factory()->default()->create(['name' => 'Free', 'monthly_price' => '0.00', 'yearly_price' => '0.00', 'max_projects' => 3]);
    $this->pro = Plan::factory()->create(['name' => 'Pro', 'max_projects' => Plan::UNLIMITED, 'trial_enabled' => true, 'trial_days' => 14]);
});

afterEach(fn () => Carbon::setTestNow());

function companyOn(Plan $plan, ?string $expiresAt, ?string $trialEndsAt = null): User
{
    $company = User::factory()->company()->create();
    $company->forceFill(['plan_id' => $plan->id, 'plan_duration' => 'yearly', 'plan_expires_at' => $expiresAt, 'trial_ends_at' => $trialEndsAt])->save();

    return $company;
}

function planRowOf(User $company): array
{
    return (array) DB::table('users')->where('id', $company->id)->first(['plan_id', 'plan_duration', 'plan_expires_at', 'trial_ends_at']);
}

test('11. expired plans and ended trials go back to the default plan; data stays; the second run moves nothing', function () {
    $expired = companyOn($this->pro, '2026-10-11 23:59:00');
    $trialEnded = companyOn($this->pro, '2026-10-12 11:00:00', '2026-10-12 11:00:00');
    $current = companyOn($this->pro, '2026-10-13 00:00:00');
    $onFree = companyOn($this->free, null);
    Tenancy::instance()->runAs($expired, fn () => Project::factory()->count(5)->create());

    $this->artisan('plans:expire')->expectsOutputToContain('Moved 2 companies to Free.')->assertSuccessful();

    foreach ([$expired, $trialEnded] as $company) {
        expect(planRowOf($company))->toBe(['plan_id' => $this->free->id, 'plan_duration' => 'monthly', 'plan_expires_at' => null, 'trial_ends_at' => null]);
    }
    expect(planRowOf($current)['plan_id'])->toBe($this->pro->id)
        ->and(planRowOf($onFree)['plan_id'])->toBe($this->free->id)
        ->and(Tenancy::instance()->runAs($expired, fn () => Project::query()->count()))->toBe(5);

    $logged = DB::table('company_activities')->whereIn('company_id', [$expired->id, $trialEnded->id])->orderBy('company_id')->get(['actor_id', 'description']);
    expect($logged->pluck('actor_id')->all())->toBe([null, null])
        ->and($logged->pluck('description')->all())->toBe(['Plan expired — moved to Free', 'Trial ended — moved to Free']);

    $this->artisan('plans:expire')->expectsOutputToContain('Moved 0 companies to Free.')->assertSuccessful();
    expect(DB::table('company_activities')->count())->toBe(2);
});

test('11b. --dry-run lists who would move and changes nothing', function () {
    $expired = companyOn($this->pro, '2026-10-01 00:00:00');
    $before = planRowOf($expired);

    $this->artisan('plans:expire --dry-run')->expectsOutputToContain('would move')->expectsOutputToContain('Would move 1 company to Free.')->assertSuccessful();
    expect(planRowOf($expired))->toBe($before);
});

test('11c. the command is scheduled daily', function () {
    $event = collect(app(Schedule::class)->events())->first(fn ($e) => str_contains($e->command ?? '', 'plans:expire'));
    expect($event)->not->toBeNull()->and($event->expression)->toBe('15 0 * * *');
});
