<?php

use App\Exceptions\PlanLimitReached;
use App\Models\Media;
use App\Models\Plan;
use App\Models\PlanOrder;
use App\Models\Project;
use App\Models\User;
use App\Services\BillingService;
use App\Services\PlanLimitService;
use App\Support\Tenancy\Tenancy;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/* Billing Phase 3 — the super admin's review API: list every company's orders, open one and its
   receipt, approve (applies plan, duration and expiry in one go) or reject (changes nothing on the
   company). Tests 6, 8 (at approval) and 13.
   Admin Plan Requests Phase 1 (tests "AP…") — what the admin page adds: the whole company row
   untouched on reject, review-once both ways, the 500-character reason, a downgrade by approval,
   receipts for any company, the list's plan filter and sort whitelist, the approval preview, and
   the one-pending-order invariant. */

beforeEach(function () {
    Storage::fake(BillingService::RECEIPT_DISK);
    Carbon::setTestNow('2026-10-12 12:00:00');
    $this->free = Plan::factory()->default()->create(['name' => 'Free', 'monthly_price' => '0.00', 'yearly_price' => '0.00', 'max_projects' => 3]);
    $this->pro = Plan::factory()->create(['name' => 'Pro', 'monthly_price' => '49.99', 'yearly_price' => '479.90', 'max_projects' => Plan::UNLIMITED, 'trial_enabled' => true, 'trial_days' => 14]);
    $this->admin = User::factory()->superAdmin()->create(['name' => 'Root Admin']);
    $this->companyA = User::factory()->company()->create(['name' => 'Alpha Co', 'email' => 'alpha@example.com']);
    $this->companyB = User::factory()->company()->create(['name' => 'Beta Co', 'email' => 'beta@example.com']);
    foreach ([$this->companyA, $this->companyB] as $company) {
        // A running trial, so approval visibly clears it.
        $company->forceFill(['plan_id' => $this->free->id, 'plan_duration' => 'monthly', 'plan_expires_at' => null, 'trial_ends_at' => '2026-10-20 00:00:00'])->save();
    }
});

afterEach(fn () => Carbon::setTestNow());

function actAsReviewer(User $user): void
{
    test()->flushSession();
    Auth::forgetGuards();
    test()->actingAs($user->fresh(), 'web'); // a fresh row, as every real request loads
}

/** A pending purchase submitted by `$company` through the API (receipt included). */
function pendingPurchase(User $company, Plan $plan, string $duration): array
{
    actAsReviewer($company);

    return test()->postJson(route('v1.plan-orders.store'), [
        'plan_id' => $plan->id, 'duration' => $duration, 'payment_method' => 'bank_transfer',
        'receipt' => UploadedFile::fake()->image('slip.png', 10, 10), 'payment_reference' => 'TRX-9',
    ])->assertCreated()->json('data');
}

function companyPlanRow(User $company): array
{
    return (array) DB::table('users')->where('id', $company->id)->first(['plan_id', 'plan_duration', 'plan_expires_at', 'trial_ends_at']);
}

test('6a. approve (monthly) sets plan, duration, expiry = now + 1 month and clears the trial; the order is stamped approved', function () {
    $order = pendingPurchase($this->companyA, $this->pro, 'monthly');
    actAsReviewer($this->admin);

    $this->patchJson(route('v1.admin.plan-orders.approve', $order['id']))->assertOk()
        ->assertJsonPath('data.status', 'approved')
        ->assertJsonPath('data.reviewer.name', 'Root Admin')
        ->assertJsonPath('data.company.name', 'Alpha Co');

    expect(companyPlanRow($this->companyA))->toBe(['plan_id' => $this->pro->id, 'plan_duration' => 'monthly', 'plan_expires_at' => '2026-11-12 12:00:00', 'trial_ends_at' => null]);
    $row = DB::table('plan_orders')->where('id', $order['id'])->first();
    expect($row->status)->toBe('approved')->and($row->reviewed_by)->toBe($this->admin->id)->and($row->reviewed_at)->toBe('2026-10-12 12:00:00');
    $activity = DB::table('company_activities')->where('company_id', $this->companyA->id)->latest('id')->first();
    expect($activity->action)->toBe('plan_changed')->and($activity->actor_id)->toBe($this->admin->id)
        ->and($activity->description)->toBe("Plan changed to Pro (monthly) — order {$order['order_code']} approved");

    // The header plan follows on the company's next /me.
    actAsReviewer($this->companyA);
    $this->getJson(route('v1.me'))->assertJsonPath('data.plan.name', 'Pro');
});

test('6b. approve (yearly) → expiry now + 1 year; approving a $0 request → no expiry', function () {
    $order = pendingPurchase($this->companyA, $this->pro, 'yearly');
    actAsReviewer($this->companyB);
    $request = $this->postJson(route('v1.plan-orders.request'), ['plan_id' => $this->free->id, 'duration' => 'yearly'])->json('data');
    actAsReviewer($this->admin);

    $this->patchJson(route('v1.admin.plan-orders.approve', $order['id']))->assertOk();
    $this->patchJson(route('v1.admin.plan-orders.approve', $request['id']))->assertOk();

    expect(companyPlanRow($this->companyA))->toMatchArray(['plan_id' => $this->pro->id, 'plan_duration' => 'yearly', 'plan_expires_at' => '2027-10-12 12:00:00', 'trial_ends_at' => null])
        ->and(companyPlanRow($this->companyB))->toMatchArray(['plan_id' => $this->free->id, 'plan_duration' => 'yearly', 'plan_expires_at' => null, 'trial_ends_at' => null]);
});

test('6c. reject stores the reason and the reviewer — nothing about the company changes; the company sees Rejected with the reason', function () {
    $order = pendingPurchase($this->companyA, $this->pro, 'yearly');
    $before = companyPlanRow($this->companyA);
    actAsReviewer($this->admin);

    $this->patchJson(route('v1.admin.plan-orders.reject', $order['id']), [])->assertUnprocessable()->assertJsonValidationErrors(['reason']);
    $this->patchJson(route('v1.admin.plan-orders.reject', $order['id']), ['reason' => '  The transfer never arrived.  '])->assertOk()
        ->assertJsonPath('data.status', 'rejected')->assertJsonPath('data.rejection_reason', 'The transfer never arrived.');

    expect(companyPlanRow($this->companyA))->toBe($before)
        ->and(DB::table('company_activities')->where('company_id', $this->companyA->id)->count())->toBe(0);
    actAsReviewer($this->companyA);
    $this->getJson(route('v1.plan-orders.show', $order['id']))->assertJsonPath('data.status_label', 'Rejected')
        ->assertJsonPath('data.rejection_reason', 'The transfer never arrived.')->assertJsonPath('data.reviewed_at', '2026-10-12T12:00:00+00:00');
    // Rejected: the company may submit again.
    $this->postJson(route('v1.plan-orders.request'), ['plan_id' => $this->pro->id, 'duration' => 'monthly'])->assertCreated();
});

test('6d. an order is reviewed once; a plan deactivated meanwhile can\'t be approved; an unknown id → 404', function () {
    $order = pendingPurchase($this->companyA, $this->pro, 'yearly');
    $other = pendingPurchase($this->companyB, $this->pro, 'monthly');
    actAsReviewer($this->admin);

    $this->patchJson(route('v1.admin.plan-orders.approve', $order['id']))->assertOk();
    $this->patchJson(route('v1.admin.plan-orders.approve', $order['id']))->assertUnprocessable()->assertJsonValidationErrors(['order' => 'This order has already been approved.']);
    $this->patchJson(route('v1.admin.plan-orders.reject', $order['id']), ['reason' => 'x'])->assertUnprocessable();

    $this->pro->forceFill(['is_active' => false])->save();
    $this->patchJson(route('v1.admin.plan-orders.approve', $other['id']))->assertUnprocessable()
        ->assertJsonValidationErrors(['order' => 'This plan is no longer available. Reject the order instead.']);
    expect(companyPlanRow($this->companyB)['plan_id'])->toBe($this->free->id);

    $this->patchJson(route('v1.admin.plan-orders.approve', 999999))->assertNotFound();
    $this->getJson(route('v1.admin.plan-orders.show', 999999))->assertNotFound();
});

test('8b. approving after the plan\'s price changed keeps the snapshotted amount', function () {
    $order = pendingPurchase($this->companyA, $this->pro, 'yearly');
    $this->pro->forceFill(['yearly_price' => '999.00'])->save();
    actAsReviewer($this->admin);

    $this->patchJson(route('v1.admin.plan-orders.approve', $order['id']))->assertOk()->assertJsonPath('data.final_amount', '479.90');
});

test('the admin list spans every company (company search, status filter), shows one order and streams its receipt', function () {
    $a = pendingPurchase($this->companyA, $this->pro, 'yearly');
    $b = pendingPurchase($this->companyB, $this->pro, 'monthly');
    actAsReviewer($this->admin);

    $this->getJson(route('v1.admin.plan-orders.index'))->assertOk()->assertJsonPath('meta.total', 2)
        ->assertJsonPath('data.0.company.name', 'Beta Co')->assertJsonPath('data.1.company.name', 'Alpha Co');
    $this->getJson(route('v1.admin.plan-orders.index', ['search' => 'alpha@']))->assertJsonCount(1, 'data')->assertJsonPath('data.0.order_code', $a['order_code']);
    $this->getJson(route('v1.admin.plan-orders.index', ['sort' => 'company', 'direction' => 'asc']))->assertJsonPath('data.0.company.name', 'Alpha Co');
    $this->getJson(route('v1.admin.plan-orders.index', ['status' => 'approved']))->assertJsonCount(0, 'data');

    $this->getJson(route('v1.admin.plan-orders.show', $b['id']))->assertOk()
        ->assertJsonPath('data.receipt_url', route('v1.admin.plan-orders.receipt', $b['id']))->assertJsonPath('data.reviewer', null);
    $this->get(route('v1.admin.plan-orders.receipt', $b['id']))->assertOk()->assertHeader('Content-Type', 'image/png');

    // An order without a receipt (a request) → 404 on the receipt route.
    $request = Tenancy::instance()->runAs($this->companyA, fn () => PlanOrder::factory()->for($this->free)->request()->create());
    $this->get(route('v1.admin.plan-orders.receipt', $request->id))->assertNotFound();
});

test('13b. a company cannot call the admin review endpoints (403)', function () {
    $order = pendingPurchase($this->companyA, $this->pro, 'yearly');
    actAsReviewer($this->companyA);

    $this->getJson(route('v1.admin.plan-orders.index'))->assertForbidden();
    $this->getJson(route('v1.admin.plan-orders.show', $order['id']))->assertForbidden();
    $this->patchJson(route('v1.admin.plan-orders.approve', $order['id']))->assertForbidden();
    $this->patchJson(route('v1.admin.plan-orders.reject', $order['id']), ['reason' => 'x'])->assertForbidden();
    $this->get(route('v1.admin.plan-orders.receipt', $order['id']))->assertForbidden();
    expect(DB::table('plan_orders')->where('id', $order['id'])->value('status'))->toBe('pending');
});

/** Every column of the company's row except `updated_at`. */
function companyRowWithoutTimestamp(User $company): array
{
    return collect((array) DB::table('users')->where('id', $company->id)->first())->except('updated_at')->all();
}

test('AP3. rejecting leaves EVERY company column as it was (apart from updated_at) — plan, dates, limits', function () {
    $order = pendingPurchase($this->companyA, $this->pro, 'yearly');
    $before = companyRowWithoutTimestamp($this->companyA);
    $limitsBefore = Tenancy::instance()->runAs($this->companyA, fn () => app(PlanLimitService::class)->usage());
    actAsReviewer($this->admin);

    $this->patchJson(route('v1.admin.plan-orders.reject', $order['id']), ['reason' => 'Wrong amount.'])->assertOk()
        ->assertJsonPath('data.reviewer.name', 'Root Admin')->assertJsonPath('data.reviewed_at', '2026-10-12T12:00:00+00:00');

    expect(companyRowWithoutTimestamp($this->companyA))->toBe($before)
        ->and(Tenancy::instance()->runAs($this->companyA, fn () => app(PlanLimitService::class)->usage()))->toBe($limitsBefore);
});

test('AP4. an order is reviewed once, both ways: reject → reject again 422, approve after reject 422', function () {
    $order = pendingPurchase($this->companyA, $this->pro, 'yearly');
    actAsReviewer($this->admin);

    $this->patchJson(route('v1.admin.plan-orders.reject', $order['id']), ['reason' => 'No transfer.'])->assertOk();
    $this->patchJson(route('v1.admin.plan-orders.reject', $order['id']), ['reason' => 'Again.'])->assertUnprocessable()
        ->assertJsonValidationErrors(['order' => 'This order has already been rejected.']);
    $this->patchJson(route('v1.admin.plan-orders.approve', $order['id']))->assertUnprocessable()
        ->assertJsonValidationErrors(['order' => 'This order has already been rejected.']);

    $row = DB::table('plan_orders')->where('id', $order['id'])->first();
    expect($row->status)->toBe('rejected')->and($row->rejection_reason)->toBe('No transfer.')
        ->and(companyPlanRow($this->companyA)['plan_id'])->toBe($this->free->id);
});

test('AP5. the rejection reason is required (blank or whitespace → 422) and at most 500 characters', function () {
    $order = pendingPurchase($this->companyA, $this->pro, 'yearly');
    actAsReviewer($this->admin);

    $this->patchJson(route('v1.admin.plan-orders.reject', $order['id']), ['reason' => '   '])->assertUnprocessable()
        ->assertJsonValidationErrors(['reason' => 'Give the company a reason for the rejection.']);
    $this->patchJson(route('v1.admin.plan-orders.reject', $order['id']), ['reason' => str_repeat('x', 501)])->assertUnprocessable()
        ->assertJsonValidationErrors(['reason' => 'The reason may not be longer than 500 characters.']);
    $this->patchJson(route('v1.admin.plan-orders.reject', $order['id']), ['reason' => str_repeat('x', 500)])->assertOk();
});

test('AP6. a DOWNGRADE by approval keeps every project and file, and blocks the next create', function () {
    $this->companyA->forceFill(['plan_id' => $this->pro->id, 'plan_duration' => 'monthly', 'trial_ends_at' => null])->save();
    Tenancy::instance()->runAs($this->companyA, function () {
        Project::factory()->count(5)->create();
        Media::factory()->count(2)->create();
    });
    actAsReviewer($this->companyA);
    $request = $this->postJson(route('v1.plan-orders.request'), ['plan_id' => $this->free->id, 'duration' => 'monthly'])->assertCreated()->json('data');
    actAsReviewer($this->admin);

    $this->patchJson(route('v1.admin.plan-orders.approve', $request['id']))->assertOk();

    $limits = app(PlanLimitService::class);
    Tenancy::instance()->runAs($this->companyA, function () use ($limits) {
        expect(Project::query()->count())->toBe(5)
            ->and(Media::query()->count())->toBe(2)
            ->and($limits->usage()['projects'])->toBe(['used' => 5, 'limit' => 3, 'remaining' => 0])
            ->and(fn () => $limits->ensureCanCreateProject())->toThrow(PlanLimitReached::class);
    });
    expect(companyPlanRow($this->companyA))->toMatchArray(['plan_id' => $this->free->id, 'plan_expires_at' => null]);
});

test('AP7. receipts: the super admin opens ANY company\'s; another company gets 404; signed out → 401 on both routes', function () {
    $a = pendingPurchase($this->companyA, $this->pro, 'yearly');
    $b = pendingPurchase($this->companyB, $this->pro, 'monthly');

    actAsReviewer($this->admin);
    $this->get(route('v1.admin.plan-orders.receipt', $a['id']))->assertOk()->assertHeader('Content-Type', 'image/png')
        ->assertHeader('Cache-Control', 'no-store, private');
    $this->get(route('v1.admin.plan-orders.receipt', $b['id']))->assertOk();

    actAsReviewer($this->companyB);
    $this->getJson(route('v1.plan-orders.receipt', $a['id']))->assertNotFound();
    $this->getJson(route('v1.admin.plan-orders.receipt', $a['id']))->assertForbidden();

    test()->flushSession();
    Auth::forgetGuards();
    $this->getJson(route('v1.admin.plan-orders.receipt', $a['id']))->assertUnauthorized();
    $this->getJson(route('v1.plan-orders.receipt', $a['id']))->assertUnauthorized();
});

test('AP9. the admin list: every company, plan filter, sorts by company / plan / created_at / status, a non-whitelisted sort is REFUSED (422), per_page ≤ 100, no N+1', function () {
    $starter = Plan::factory()->create(['name' => 'Starter', 'monthly_price' => '19.99', 'yearly_price' => '191.90', 'max_projects' => 25]);
    Carbon::setTestNow('2026-10-10 09:00:00');
    $a = pendingPurchase($this->companyA, $starter, 'monthly');
    Carbon::setTestNow('2026-10-11 09:00:00');
    $b = pendingPurchase($this->companyB, $this->pro, 'yearly');
    Carbon::setTestNow('2026-10-12 12:00:00');
    actAsReviewer($this->admin);
    $this->patchJson(route('v1.admin.plan-orders.reject', $a['id']), ['reason' => 'No.'])->assertOk();

    $codes = fn (array $query) => collect($this->getJson(route('v1.admin.plan-orders.index', $query))->assertOk()->json('data'))->pluck('order_code')->all();
    $newestFirst = [$b['order_code'], $a['order_code']];
    $oldestFirst = [$a['order_code'], $b['order_code']];

    expect($codes([]))->toBe($newestFirst)
        ->and($codes(['plan_id' => $starter->id]))->toBe([$a['order_code']])
        ->and($codes(['sort' => 'created_at', 'direction' => 'asc']))->toBe($oldestFirst)
        ->and($codes(['sort' => 'plan', 'direction' => 'asc']))->toBe($newestFirst) // Pro before Starter
        ->and($codes(['sort' => 'status', 'direction' => 'asc']))->toBe($newestFirst) // pending before rejected
        ->and($codes(['sort' => 'company', 'direction' => 'desc']))->toBe($newestFirst) // Beta before Alpha
        ->and($codes(['status' => 'pending', 'search' => 'beta']))->toBe([$b['order_code']]);

    $this->getJson(route('v1.admin.plan-orders.index', ['sort' => 'receipt_path']))->assertUnprocessable()
        ->assertJsonValidationErrors(['sort' => 'The list cannot be sorted by this column.']);
    $this->getJson(route('v1.admin.plan-orders.index', ['plan_id' => 999999]))->assertUnprocessable()->assertJsonValidationErrors(['plan_id']);
    $this->getJson(route('v1.admin.plan-orders.index', ['per_page' => 101]))->assertUnprocessable()->assertJsonValidationErrors(['per_page']);

    // No N+1: the query count doesn't grow with the rows.
    $count = function (): int {
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson(route('v1.admin.plan-orders.index'))->assertOk();
        DB::disableQueryLog();

        return count(DB::getQueryLog());
    };
    $two = $count();
    foreach (User::factory()->company()->count(4)->create() as $company) {
        Tenancy::instance()->runAs($company, fn () => PlanOrder::factory()->for($this->pro)->approved()->create(['reviewed_by' => $this->admin->id]));
    }
    expect($count())->toBe($two);
});

test('AP-preview. a pending order says what approving would set (the service\'s own expiry); reviewed orders don\'t', function () {
    $yearly = pendingPurchase($this->companyA, $this->pro, 'yearly');
    actAsReviewer($this->companyB);
    $free = $this->postJson(route('v1.plan-orders.request'), ['plan_id' => $this->free->id, 'duration' => 'yearly'])->assertCreated()->json('data');
    actAsReviewer($this->admin);

    $this->getJson(route('v1.admin.plan-orders.show', $yearly['id']))->assertJsonPath('data.approval.expires_at', '2027-10-12T12:00:00+00:00');
    // A $0 plan never expires.
    $this->getJson(route('v1.admin.plan-orders.show', $free['id']))->assertJsonPath('data.approval', ['expires_at' => null]);

    $this->patchJson(route('v1.admin.plan-orders.approve', $yearly['id']))->assertOk()->assertJsonPath('data.approval', null);
    expect(companyPlanRow($this->companyA)['plan_expires_at'])->toBe('2027-10-12 12:00:00');
});

test('AP-invariant. approving one order leaves the company\'s other orders untouched — and a company never holds two pending', function () {
    $old = Tenancy::instance()->runAs($this->companyA, fn () => [
        PlanOrder::factory()->for($this->pro)->rejected('Earlier.')->create(['reviewed_by' => $this->admin->id]),
        PlanOrder::factory()->for($this->free)->request()->approved()->create(['reviewed_by' => $this->admin->id]),
    ]);
    $ids = collect($old)->pluck('id')->all();
    $snapshot = fn () => DB::table('plan_orders')->whereIn('id', $ids)->orderBy('id')->get()->map(fn ($row) => (array) $row)->all();
    $before = $snapshot();

    $order = pendingPurchase($this->companyA, $this->pro, 'yearly');
    actAsReviewer($this->companyA);
    $this->postJson(route('v1.plan-orders.request'), ['plan_id' => $this->pro->id, 'duration' => 'monthly'])->assertUnprocessable();
    expect(DB::table('plan_orders')->where('company_id', $this->companyA->id)->where('status', 'pending')->count())->toBe(1);

    actAsReviewer($this->admin);
    $this->patchJson(route('v1.admin.plan-orders.approve', $order['id']))->assertOk();

    expect($snapshot())->toBe($before)
        ->and(DB::table('plan_orders')->where('company_id', $this->companyA->id)->where('status', 'pending')->count())->toBe(0);
});
