<?php

use App\Models\Plan;
use App\Models\PlanOrder;
use App\Models\User;
use App\Services\BillingService;
use App\Support\Tenancy\Tenancy;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/* Billing Phase 3 — the super admin's review API (no UI yet): list every company's orders, open one
   and its receipt, approve (applies plan, duration and expiry in one go) or reject (changes nothing on
   the company). Tests 6, 8 (at approval) and 13. */

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
