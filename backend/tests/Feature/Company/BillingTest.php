<?php

use App\Enums\PaymentMethod;
use App\Enums\PlanDuration;
use App\Exceptions\PlanLimitReached;
use App\Models\Company;
use App\Models\Plan;
use App\Models\PlanOrder;
use App\Models\Project;
use App\Models\Setting;
use App\Models\User;
use App\Services\BillingService;
use App\Services\PlanLimitService;
use App\Support\Tenancy\Tenancy;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

/* Billing Phase 3 — the company side: the catalog, the checkout (purchase), Request Plan, trials, the
   $0 plan, the Plan Requests list, receipts, and tenant isolation. Storage is faked; time is fixed.
   Plans: Free (default, $0, 3 projects) · Starter ($19.99 / $191.90, 25 projects, 7-day trial) ·
   Pro ($49.99 / $479.90, unlimited, 14-day trial). Both companies start on Free monthly. */

beforeEach(function () {
    Storage::fake(BillingService::RECEIPT_DISK);
    Carbon::setTestNow('2026-10-12 12:00:00');
    $this->free = Plan::factory()->default()->create(['name' => 'Free', 'monthly_price' => '0.00', 'yearly_price' => '0.00', 'max_projects' => 3, 'storage_limit_gb' => '1.00', 'sort_order' => 1]);
    $this->starter = Plan::factory()->create(['name' => 'Starter', 'monthly_price' => '19.99', 'yearly_price' => '191.90', 'max_projects' => 25, 'trial_enabled' => true, 'trial_days' => 7, 'sort_order' => 2]);
    $this->pro = Plan::factory()->create(['name' => 'Pro', 'monthly_price' => '49.99', 'yearly_price' => '479.90', 'max_projects' => Plan::UNLIMITED, 'trial_enabled' => true, 'trial_days' => 14, 'ai_integration' => true, 'is_recommended' => true, 'sort_order' => 3]);
    $this->companyA = User::factory()->company()->create(['name' => 'Alpha Co']);
    $this->companyB = User::factory()->company()->create(['name' => 'Beta Co']);
    foreach ([$this->companyA, $this->companyB] as $company) {
        $company->forceFill(['plan_id' => $this->free->id, 'plan_duration' => 'monthly', 'plan_expires_at' => null, 'trial_ends_at' => null])->save();
    }
});

afterEach(fn () => Carbon::setTestNow());

function actAsBilling(User $user): void
{
    test()->flushSession();
    Auth::forgetGuards();
    test()->actingAs($user->fresh(), 'web'); // a fresh row, as every real request loads
}

function receiptPng(string $name = 'receipt.png'): UploadedFile
{
    return UploadedFile::fake()->image($name, 20, 20);
}

/** @param array<string, mixed> $overrides */
function purchasePayload(Plan $plan, string $duration = 'yearly', array $overrides = []): array
{
    return ['plan_id' => $plan->id, 'duration' => $duration, 'payment_method' => 'bank_transfer', 'receipt' => receiptPng(), 'payment_reference' => 'TRX-1001', 'notes' => 'Paid today', ...$overrides];
}

/** The company's plan fields, for "nothing changed" checks. */
function planState(User $company): array
{
    $row = DB::table('users')->where('id', $company->id)->first(['plan_id', 'plan_duration', 'plan_expires_at', 'trial_ends_at']);

    return (array) $row;
}

function ordersOf(User $company): Collection
{
    return Tenancy::instance()->runAs($company, fn () => PlanOrder::withTrashed()->orderBy('id')->get());
}

/* ── 1–5 · the checkout ──────────────────────────────────────────────────────────────── */

test('1. a purchase creates a PENDING order: company from the session, a unique ORD-YYYY-NNNN code, the snapshotted price, the receipt on the private disk (not the media library)', function () {
    actAsBilling($this->companyA);
    $response = $this->postJson(route('v1.plan-orders.store'), purchasePayload($this->pro, 'yearly', ['company_id' => $this->companyB->id, 'status' => 'approved', 'price' => '1.00', 'type' => 'trial']))
        ->assertCreated()
        ->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.type', 'purchase')
        ->assertJsonPath('data.plan.name', 'Pro')
        ->assertJsonPath('data.duration', 'yearly')
        ->assertJsonPath('data.price', '479.90')
        ->assertJsonPath('data.discount', '0.00')
        ->assertJsonPath('data.final_amount', '479.90')
        ->assertJsonPath('data.payment_method', 'bank_transfer')
        ->assertJsonPath('data.payment_reference', 'TRX-1001')
        ->assertJsonPath('data.receipt_name', 'receipt.png')
        ->assertJsonPath('data.has_receipt', true);

    $order = ordersOf($this->companyA)->sole();
    expect($order->company_id)->toBe($this->companyA->id)
        ->and($order->order_code)->toBe('ORD-2026-0001')
        ->and($order->receipt_path)->toStartWith("billing/receipts/{$this->companyA->id}/")
        ->and($response->json('data.receipt_url'))->toBe(route('v1.plan-orders.receipt', $order->id))
        ->and($response->json('data'))->not->toHaveKey('receipt_path')
        ->and(DB::table('media')->count())->toBe(0);
    Storage::disk(BillingService::RECEIPT_DISK)->assertExists($order->receipt_path);

    // Codes are unique and sequential (company B's purchase takes the next one).
    actAsBilling($this->companyB);
    $this->postJson(route('v1.plan-orders.store'), purchasePayload($this->starter))->assertCreated()->assertJsonPath('data.order_code', 'ORD-2026-0002');
    // The receipt never counts against the plan's storage.
    $this->getJson(route('v1.plan-usage'))->assertJsonPath('data.storage.used_bytes', 0);
});

test('2. the receipt: missing → 422, over 5 MB → 422, an .exe → 422; a PDF is accepted; nothing is stored on refusal', function () {
    actAsBilling($this->companyA);
    $this->postJson(route('v1.plan-orders.store'), purchasePayload($this->pro, 'yearly', ['receipt' => null]))
        ->assertUnprocessable()->assertJsonValidationErrors(['receipt' => 'Attach the payment receipt.']);
    $this->postJson(route('v1.plan-orders.store'), purchasePayload($this->pro, 'yearly', ['receipt' => UploadedFile::fake()->create('big.pdf', 6 * 1024, 'application/pdf')]))
        ->assertUnprocessable()->assertJsonValidationErrors(['receipt' => 'The receipt may not be larger than 5 MB.']);
    $this->postJson(route('v1.plan-orders.store'), purchasePayload($this->pro, 'yearly', ['receipt' => UploadedFile::fake()->create('setup.exe', 10, 'application/x-msdownload')]))
        ->assertUnprocessable()->assertJsonValidationErrors(['receipt' => 'The receipt must be a JPG, PNG or PDF file.']);
    expect(ordersOf($this->companyA))->toHaveCount(0)->and(Storage::disk(BillingService::RECEIPT_DISK)->allFiles())->toBe([]);

    $this->postJson(route('v1.plan-orders.store'), purchasePayload($this->pro, 'yearly', ['receipt' => UploadedFile::fake()->create('transfer.pdf', 200, 'application/pdf')]))
        ->assertCreated()->assertJsonPath('data.receipt_name', 'transfer.pdf');
    expect(ordersOf($this->companyA)->sole()->receipt_path)->toEndWith('.pdf');
});

test('3. payment_method = stripe → 422, even crafted without a receipt, and even when the service is called directly', function () {
    actAsBilling($this->companyA);
    $this->postJson(route('v1.plan-orders.store'), purchasePayload($this->pro, 'yearly', ['payment_method' => 'stripe']))
        ->assertUnprocessable()->assertJsonValidationErrors(['payment_method' => 'Card payments aren\'t available yet. Please pay by bank transfer.']);
    $this->postJson(route('v1.plan-orders.store'), ['plan_id' => $this->pro->id, 'duration' => 'monthly', 'payment_method' => 'stripe'])
        ->assertUnprocessable()->assertJsonValidationErrors(['payment_method']);
    foreach (['manual', 'free', 'paypal'] as $method) {
        $this->postJson(route('v1.plan-orders.store'), purchasePayload($this->pro, 'yearly', ['payment_method' => $method]))->assertUnprocessable()->assertJsonValidationErrors(['payment_method']);
    }

    $company = Company::find($this->companyA->id);
    expect(fn () => app(BillingService::class)->submitPurchase($company, $this->pro, PlanDuration::Yearly, PaymentMethod::Stripe, receiptPng(), null, null))
        ->toThrow(ValidationException::class, 'Card payments aren\'t available yet');
    expect(ordersOf($this->companyA))->toHaveCount(0);
});

test('4. while an order is pending every other submission → 422 (purchase, request, trial, free)', function () {
    actAsBilling($this->companyA);
    $this->postJson(route('v1.plan-orders.store'), purchasePayload($this->pro))->assertCreated();

    $message = 'You already have a plan request waiting for review. You can submit another once it has been reviewed.';
    $this->postJson(route('v1.plan-orders.store'), purchasePayload($this->starter))->assertUnprocessable()->assertJsonValidationErrors(['pending_order' => $message]);
    $this->postJson(route('v1.plan-orders.request'), ['plan_id' => $this->starter->id, 'duration' => 'monthly'])->assertUnprocessable()->assertJsonValidationErrors(['pending_order']);
    $this->postJson(route('v1.plan-orders.trial'), ['plan_id' => $this->starter->id, 'duration' => 'monthly'])->assertUnprocessable()->assertJsonValidationErrors(['pending_order']);
    $this->postJson(route('v1.plan-orders.free'), ['plan_id' => $this->free->id, 'duration' => 'yearly'])->assertUnprocessable()->assertJsonValidationErrors(['pending_order']);
    expect(ordersOf($this->companyA))->toHaveCount(1);
    $this->getJson(route('v1.plans.index'))->assertJsonPath('data.pending_order.plan.name', 'Pro');
});

test('5. submitting does NOT change the company: plan, duration, expiry, trial and /me stay as they were', function () {
    $before = planState($this->companyA);
    actAsBilling($this->companyA);
    $this->postJson(route('v1.plan-orders.store'), purchasePayload($this->pro))->assertCreated();
    expect(planState($this->companyA))->toBe($before);
    $this->getJson(route('v1.me'))->assertJsonPath('data.plan.name', 'Free');

    // Request Plan: pending, no payment, amount 0 — and the company still untouched.
    actAsBilling($this->companyB);
    $this->postJson(route('v1.plan-orders.request'), ['plan_id' => $this->starter->id, 'duration' => 'yearly', 'notes' => 'For the new team'])
        ->assertCreated()->assertJsonPath('data.type', 'request')->assertJsonPath('data.status', 'pending')
        ->assertJsonPath('data.final_amount', '0.00')->assertJsonPath('data.payment_method', 'manual')->assertJsonPath('data.has_receipt', false)->assertJsonPath('data.receipt_url', null);
    expect(planState($this->companyB)['plan_id'])->toBe($this->free->id);
});

test('5b. the current plan (plan AND duration) can\'t be ordered again; the same plan for the other duration can', function () {
    $this->companyA->forceFill(['plan_id' => $this->pro->id, 'plan_duration' => 'yearly'])->save();
    actAsBilling($this->companyA);
    $this->postJson(route('v1.plan-orders.store'), purchasePayload($this->pro, 'yearly'))->assertUnprocessable()->assertJsonValidationErrors(['plan_id' => 'This is already your current plan.']);
    $this->postJson(route('v1.plan-orders.request'), ['plan_id' => $this->pro->id, 'duration' => 'yearly'])->assertUnprocessable()->assertJsonValidationErrors(['plan_id']);
    $this->postJson(route('v1.plan-orders.store'), purchasePayload($this->pro, 'monthly'))->assertCreated()->assertJsonPath('data.price', '49.99');
});

test('5c. an inactive or deleted plan → 422; a $0 plan is never bought through the checkout', function () {
    actAsBilling($this->companyA);
    $this->starter->forceFill(['is_active' => false])->save();
    $this->postJson(route('v1.plan-orders.store'), purchasePayload($this->starter))->assertUnprocessable()->assertJsonValidationErrors(['plan_id' => 'This plan is not available.']);
    $this->pro->delete();
    $this->postJson(route('v1.plan-orders.request'), ['plan_id' => $this->pro->id, 'duration' => 'monthly'])->assertUnprocessable()->assertJsonValidationErrors(['plan_id']);
    $this->postJson(route('v1.plan-orders.store'), purchasePayload($this->free, 'yearly'))->assertUnprocessable()
        ->assertJsonValidationErrors(['plan_id' => 'This plan is free — subscribe to it directly, no payment needed.']);
});

/* ── 7–8 · limits and the price snapshot ────────────────────────────────────────────── */

test('7. after approval the NEW limits apply: 3 projects → 25; after a downgrade existing projects survive but a new create is blocked', function () {
    $limits = app(PlanLimitService::class);
    Tenancy::instance()->runAs($this->companyA, fn () => Project::factory()->count(3)->create());
    $canCreate = fn (): bool => Tenancy::instance()->runAs($this->companyA, function () use ($limits): bool {
        try {
            $limits->ensureCanCreateProject();

            return true;
        } catch (PlanLimitReached) {
            return false;
        }
    });
    expect($canCreate())->toBeFalse();

    actAsBilling($this->companyA);
    $orderId = $this->postJson(route('v1.plan-orders.store'), purchasePayload($this->starter, 'monthly'))->json('data.id');
    actAsBilling(User::factory()->superAdmin()->create());
    $this->patchJson(route('v1.admin.plan-orders.approve', $orderId))->assertOk();

    expect(Tenancy::instance()->runAs($this->companyA, fn () => $limits->usage()['projects']))->toBe(['used' => 3, 'limit' => 25, 'remaining' => 22])->and($canCreate())->toBeTrue();
    Tenancy::instance()->runAs($this->companyA, fn () => Project::factory()->count(2)->create()); // 5 now

    // Back down to Free: nothing is deleted, only new creates are blocked.
    actAsBilling($this->companyA);
    $this->postJson(route('v1.plan-orders.free'), ['plan_id' => $this->free->id, 'duration' => 'monthly'])->assertCreated();
    expect(Tenancy::instance()->runAs($this->companyA, fn () => $limits->usage()['projects']))->toBe(['used' => 5, 'limit' => 3, 'remaining' => 0])->and($canCreate())->toBeFalse();
});

test('8. editing the plan\'s price afterwards does NOT change a pending order\'s amount', function () {
    actAsBilling($this->companyA);
    $orderId = $this->postJson(route('v1.plan-orders.store'), purchasePayload($this->pro, 'yearly'))->json('data.id');
    $this->pro->forceFill(['yearly_price' => '999.00', 'monthly_price' => '99.00'])->save();

    $this->getJson(route('v1.plan-orders.show', $orderId))->assertJsonPath('data.price', '479.90')->assertJsonPath('data.final_amount', '479.90');
});

/* ── 9–10 · trials and the $0 plan ──────────────────────────────────────────────────── */

test('9. a trial applies at once (trial_ends_at = expiry = now + days, an approved trial order); a second trial of that plan → 422; no trial on a plan without one or on the current plan', function () {
    actAsBilling($this->companyA);
    $this->postJson(route('v1.plan-orders.trial'), ['plan_id' => $this->pro->id, 'duration' => 'monthly'])
        ->assertCreated()->assertJsonPath('data.type', 'trial')->assertJsonPath('data.status', 'approved')
        ->assertJsonPath('data.payment_method', 'free')->assertJsonPath('data.final_amount', '0.00');

    $state = planState($this->companyA);
    expect($state['plan_id'])->toBe($this->pro->id)->and($state['plan_duration'])->toBe('monthly')
        ->and(Carbon::parse($state['trial_ends_at'])->toDateTimeString())->toBe('2026-10-26 12:00:00')
        ->and(Carbon::parse($state['plan_expires_at'])->toDateTimeString())->toBe('2026-10-26 12:00:00');
    actAsBilling($this->companyA); // the next request loads the changed row
    $this->getJson(route('v1.me'))->assertJsonPath('data.plan.name', 'Pro');

    // On it → refused; after leaving it, still refused: one trial per plan, ever.
    $this->postJson(route('v1.plan-orders.trial'), ['plan_id' => $this->pro->id, 'duration' => 'yearly'])->assertUnprocessable()->assertJsonValidationErrors(['plan_id' => 'You\'re already on this plan.']);
    $this->postJson(route('v1.plan-orders.free'), ['plan_id' => $this->free->id, 'duration' => 'monthly'])->assertCreated();
    $this->postJson(route('v1.plan-orders.trial'), ['plan_id' => $this->pro->id, 'duration' => 'monthly'])->assertUnprocessable()
        ->assertJsonValidationErrors(['plan_id' => 'You\'ve already used the free trial of this plan.']);
    // A deleted trial order still counts.
    Tenancy::instance()->runAs($this->companyA, fn () => PlanOrder::query()->where('type', 'trial')->delete());
    $this->postJson(route('v1.plan-orders.trial'), ['plan_id' => $this->pro->id, 'duration' => 'monthly'])->assertUnprocessable();
    // No trial on a plan without one.
    $this->postJson(route('v1.plan-orders.trial'), ['plan_id' => $this->free->id, 'duration' => 'yearly'])->assertUnprocessable()->assertJsonValidationErrors(['plan_id' => 'This plan has no free trial.']);
    // Another plan's trial is still available.
    $this->postJson(route('v1.plan-orders.trial'), ['plan_id' => $this->starter->id, 'duration' => 'yearly'])->assertCreated();
});

test('10. Subscribe Now on a $0 plan applies at once with an auto-approved order (never expires); on a paid plan → 422', function () {
    $this->companyA->forceFill(['plan_id' => $this->pro->id, 'plan_duration' => 'monthly', 'plan_expires_at' => '2026-11-12 12:00:00', 'trial_ends_at' => '2026-10-20 00:00:00'])->save();
    actAsBilling($this->companyA);
    $this->postJson(route('v1.plan-orders.free'), ['plan_id' => $this->starter->id, 'duration' => 'monthly'])->assertUnprocessable()
        ->assertJsonValidationErrors(['plan_id' => 'This plan isn\'t free — subscribe to it through the checkout.']);

    $this->postJson(route('v1.plan-orders.free'), ['plan_id' => $this->free->id, 'duration' => 'yearly'])
        ->assertCreated()->assertJsonPath('data.type', 'purchase')->assertJsonPath('data.status', 'approved')->assertJsonPath('data.payment_method', 'free');
    expect(planState($this->companyA))->toBe(['plan_id' => $this->free->id, 'plan_duration' => 'yearly', 'plan_expires_at' => null, 'trial_ends_at' => null]);
    actAsBilling($this->companyA);
    $this->getJson(route('v1.me'))->assertJsonPath('data.plan', ['id' => $this->free->id, 'name' => 'Free', 'duration' => 'yearly']);
});

/* ── 12 · tenant isolation ───────────────────────────────────────────────────────────── */

test('12. company A cannot see, open or download company B\'s orders or receipts (404); the list and the catalog never leak; signed out → 401', function () {
    actAsBilling($this->companyB);
    $bOrder = $this->postJson(route('v1.plan-orders.store'), purchasePayload($this->pro))->json('data');
    actAsBilling($this->companyA);
    $this->postJson(route('v1.plan-orders.request'), ['plan_id' => $this->starter->id, 'duration' => 'monthly'])->assertCreated();

    $this->getJson(route('v1.plan-orders.index'))->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.company.name', 'Alpha Co');
    $this->getJson(route('v1.plan-orders.index', ['search' => $bOrder['order_code']]))->assertJsonCount(0, 'data');
    $this->getJson(route('v1.plan-orders.show', $bOrder['id']))->assertNotFound();
    $this->getJson(route('v1.plan-orders.receipt', $bOrder['id']))->assertNotFound();
    $this->getJson(route('v1.plans.index'))->assertJsonPath('data.pending_order.plan.name', 'Starter');

    // B can stream its own receipt — private and never cached; ?download=1 as an attachment.
    actAsBilling($this->companyB);
    $stream = $this->get(route('v1.plan-orders.receipt', $bOrder['id']))->assertOk()->assertHeader('Content-Type', 'image/png');
    expect($stream->headers->get('Cache-Control'))->toContain('no-store')->and($stream->headers->get('Content-Disposition'))->toStartWith('inline');
    expect($this->get(route('v1.plan-orders.receipt', ['order' => $bOrder['id'], 'download' => 1]))->headers->get('Content-Disposition'))->toStartWith('attachment');

    Auth::forgetGuards();
    $this->flushSession();
    $this->app['auth']->guard('web')->logout();
    $this->getJson(route('v1.plan-orders.receipt', $bOrder['id']))->assertUnauthorized();
    $this->getJson(route('v1.plans.index'))->assertUnauthorized();
});

test('13a. a super admin cannot call the company billing endpoints (403)', function () {
    actAsBilling(User::factory()->superAdmin()->create());
    $this->getJson(route('v1.plans.index'))->assertForbidden();
    $this->getJson(route('v1.plan-orders.index'))->assertForbidden();
    $this->postJson(route('v1.plan-orders.store'), purchasePayload($this->pro))->assertForbidden();
    $this->postJson(route('v1.plan-orders.trial'), ['plan_id' => $this->pro->id, 'duration' => 'monthly'])->assertForbidden();
});

/* ── The catalog and the list ────────────────────────────────────────────────────────── */

test('the catalog: active plans in order with trial flags, the current plan + duration, no pending order', function () {
    $this->companyA->forceFill(['plan_id' => $this->pro->id, 'plan_duration' => 'yearly', 'plan_expires_at' => '2027-10-12 12:00:00'])->save();
    Plan::factory()->create(['name' => 'Hidden', 'is_active' => false]);
    Tenancy::instance()->runAs($this->companyA, fn () => PlanOrder::factory()->for($this->starter)->trial()->create());
    actAsBilling($this->companyA);

    $data = $this->getJson(route('v1.plans.index'))->assertOk()->json('data');
    expect(collect($data['plans'])->pluck('name')->all())->toBe(['Free', 'Starter', 'Pro'])
        ->and(collect($data['plans'])->map(fn ($p) => [$p['name'], $p['trial_used'], $p['trial_available']])->all())
        ->toBe([['Free', false, false], ['Starter', true, false], ['Pro', false, false]])
        ->and($data['plans'][2])->toMatchArray(['yearly_price' => '479.90', 'max_projects' => -1, 'is_unlimited' => true, 'is_recommended' => true, 'ai_integration' => true, 'trial_days' => 14])
        ->and($data['current'])->toMatchArray(['plan_id' => $this->pro->id, 'duration' => 'yearly', 'trial_ends_at' => null])
        ->and($data['current']['expires_at'])->toStartWith('2027-10-12')
        ->and($data['pending_order'])->toBeNull()
        ->and($data['bank_details'])->toBe(['bank_name' => null, 'bank_account_name' => null, 'bank_account_number' => null, 'bank_branch' => null, 'bank_swift' => null, 'bank_instructions' => null]);

    // The checkout's bank details come from the global settings (never a company's own).
    Setting::putGlobal('bank_name', 'First Bank');
    $other = new Setting(['key' => 'bank_swift', 'value' => 'NOT-MINE']);
    $other->company_id = $this->companyB->id;
    $other->save();
    $this->getJson(route('v1.plans.index'))->assertJsonPath('data.bank_details.bank_name', 'First Bank')->assertJsonPath('data.bank_details.bank_swift', null);
});

test('the Plan Requests list: newest first, status and search filters, the sort whitelist, pagination meta', function () {
    Tenancy::instance()->runAs($this->companyA, function () {
        PlanOrder::factory()->for($this->pro)->approved()->create(['order_code' => 'ORD-2026-0101', 'created_at' => '2026-09-01 10:00:00']);
        PlanOrder::factory()->for($this->starter)->rejected('No transfer found.')->create(['order_code' => 'ORD-2026-0102', 'created_at' => '2026-09-10 10:00:00']);
        PlanOrder::factory()->for($this->free)->request()->create(['order_code' => 'ORD-2026-0103', 'created_at' => '2026-10-01 10:00:00']);
    });
    actAsBilling($this->companyA);

    $this->getJson(route('v1.plan-orders.index'))->assertOk()
        ->assertJsonPath('meta.total', 3)
        ->assertJsonPath('data.0.order_code', 'ORD-2026-0103')
        ->assertJsonPath('data.0.status_label', 'Pending')
        ->assertJsonPath('data.0.duration_label', 'Monthly')
        ->assertJsonPath('data.2.order_code', 'ORD-2026-0101');
    $this->getJson(route('v1.plan-orders.index', ['status' => 'rejected']))->assertJsonCount(1, 'data')->assertJsonPath('data.0.rejection_reason', 'No transfer found.');
    $this->getJson(route('v1.plan-orders.index', ['search' => 'starter']))->assertJsonCount(1, 'data')->assertJsonPath('data.0.plan.name', 'Starter');
    $this->getJson(route('v1.plan-orders.index', ['sort' => 'plan', 'direction' => 'asc']))->assertJsonPath('data.0.plan.name', 'Free')->assertJsonPath('data.2.plan.name', 'Starter');
    $this->getJson(route('v1.plan-orders.index', ['sort' => 'requested_at', 'direction' => 'asc', 'per_page' => 2]))
        ->assertJsonPath('data.0.order_code', 'ORD-2026-0101')->assertJsonCount(2, 'data')->assertJsonPath('meta.last_page', 2);
    $this->getJson(route('v1.plan-orders.index', ['sort' => 'receipt_path']))->assertUnprocessable()->assertJsonValidationErrors(['sort']);
    $this->getJson(route('v1.plan-orders.index', ['status' => 'paid']))->assertUnprocessable()->assertJsonValidationErrors(['status']);
});
