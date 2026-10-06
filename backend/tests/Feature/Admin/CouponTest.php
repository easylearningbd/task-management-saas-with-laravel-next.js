<?php

use App\Enums\CouponType;
use App\Models\Coupon;
use App\Models\User;
use Database\Seeders\CouponSeeder;

/* /api/v1/admin/coupons — Super Admin coupon CRUD, toggle-status, generate-code, the list
   query (search / filters / sort / pagination) and every rule in CouponService. Runs on the
   isolated sqlite :memory: database. */

beforeEach(function () {
    $this->actingAs(User::factory()->superAdmin()->create(), 'web');
});

function couponPayload(array $overrides = []): array
{
    return array_merge([
        'name' => 'Spring Sale',
        'code_mode' => 'manual',
        'code' => 'SPRING25',
        'type' => 'percentage',
        'value' => '25',
        'min_spend' => null,
        'max_spend' => null,
        'usage_limit' => 100,
        'per_user_limit' => 1,
        'expiry_date' => now()->addMonth()->toDateString(),
        'is_active' => true,
    ], $overrides);
}

/** Codes on the current list response, in order. */
function listedCodes($response): array
{
    return collect($response->json('data'))->pluck('code')->all();
}

// ───────────────────────────── 1–2: create

test('1. creating a percentage coupon → 201, code stored uppercase', function () {
    $this->postJson(route('v1.admin.coupons.store'), couponPayload(['code' => 'spring25']))
        ->assertCreated()
        ->assertJsonPath('data.code', 'SPRING25')
        ->assertJsonPath('data.type', 'percentage')
        ->assertJsonPath('data.type_label', 'Percentage')
        ->assertJsonPath('data.value', '25.00')
        ->assertJsonPath('data.discount_display', '25%')
        ->assertJsonPath('data.usage_limit_display', '100')
        ->assertJsonPath('data.is_active', true);

    expect(Coupon::sole()->only(['name', 'code', 'type', 'value', 'usage_limit', 'per_user_limit']))->toBe([
        'name' => 'Spring Sale', 'code' => 'SPRING25', 'type' => CouponType::Percentage,
        'value' => '25.00', 'usage_limit' => 100, 'per_user_limit' => 1,
    ]);
});

test('2. creating a flat coupon with min + max spend → 201', function () {
    $this->postJson(route('v1.admin.coupons.store'), couponPayload([
        'code' => 'FLAT1000', 'type' => 'flat', 'value' => '1000', 'min_spend' => '50', 'max_spend' => '2500.5',
    ]))
        ->assertCreated()
        ->assertJsonPath('data.type_label', 'Flat Amount')
        ->assertJsonPath('data.value', '1000.00')
        ->assertJsonPath('data.discount_display', '$1,000.00')
        ->assertJsonPath('data.min_spend', '50.00')
        ->assertJsonPath('data.max_spend', '2500.50');
});

// ───────────────────────────── 3: value

test('3. a percentage value of 150 or 0 → 422 under value', function (string $value, string $message) {
    $this->postJson(route('v1.admin.coupons.store'), couponPayload(['value' => $value]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['value' => $message]);

    expect(Coupon::count())->toBe(0);
})->with([
    '150' => ['150', 'A percentage discount cannot be more than 100%.'],
    '0' => ['0', 'The discount value must be greater than 0.'],
]);

test('3b. percentage 100 is allowed; flat has no upper bound; flat 0 and 3 decimals are rejected', function () {
    $this->postJson(route('v1.admin.coupons.store'), couponPayload(['code' => 'P100', 'value' => '100']))
        ->assertCreated()->assertJsonPath('data.discount_display', '100%');
    $this->postJson(route('v1.admin.coupons.store'), couponPayload(['code' => 'F150', 'type' => 'flat', 'value' => '150']))
        ->assertCreated()->assertJsonPath('data.discount_display', '$150.00');
    $this->postJson(route('v1.admin.coupons.store'), couponPayload(['code' => 'F0', 'type' => 'flat', 'value' => '0']))
        ->assertUnprocessable()->assertJsonValidationErrors(['value']);
    $this->postJson(route('v1.admin.coupons.store'), couponPayload(['code' => 'P3DEC', 'value' => '12.345']))
        ->assertUnprocessable()->assertJsonValidationErrors(['value' => 'Enter an amount with at most 2 decimal places.']);
});

test('3c. switching an existing coupon to percentage re-checks its value', function () {
    $coupon = Coupon::factory()->flat('150.00')->create();

    $this->putJson(route('v1.admin.coupons.update', $coupon), couponPayload(['code' => $coupon->code, 'value' => '150']))
        ->assertUnprocessable()->assertJsonValidationErrors(['value']);
});

// ───────────────────────────── 4–5: code

test('4. a duplicate code → 422 under code; keeping its own code while updating passes', function () {
    $existing = Coupon::factory()->create(['code' => 'TAKEN10']);

    $this->postJson(route('v1.admin.coupons.store'), couponPayload(['code' => 'taken10']))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['code' => 'This coupon code is already in use.']);

    $this->putJson(route('v1.admin.coupons.update', $existing), couponPayload(['code' => 'TAKEN10', 'name' => 'Renamed']))
        ->assertOk()
        ->assertJsonPath('data.code', 'TAKEN10')
        ->assertJsonPath('data.name', 'Renamed');

    $other = Coupon::factory()->create(['code' => 'OTHER10']);
    $this->putJson(route('v1.admin.coupons.update', $other), couponPayload(['code' => 'TAKEN10']))
        ->assertUnprocessable()->assertJsonValidationErrors(['code']);
});

test('4b. a soft-deleted coupon keeps its code reserved', function () {
    Coupon::factory()->create(['code' => 'GONE10'])->delete();

    $this->postJson(route('v1.admin.coupons.store'), couponPayload(['code' => 'GONE10']))
        ->assertUnprocessable()->assertJsonValidationErrors(['code' => 'This coupon code is already in use.']);
});

test('5. a lowercase, padded code is stored and returned uppercase', function () {
    $id = $this->postJson(route('v1.admin.coupons.store'), couponPayload(['code' => '  summer-sale_2  ']))
        ->assertCreated()
        ->assertJsonPath('data.code', 'SUMMER-SALE_2')
        ->json('data.id');

    $this->getJson(route('v1.admin.coupons.show', $id))->assertJsonPath('data.code', 'SUMMER-SALE_2');
    expect(Coupon::find($id)->getRawOriginal('code'))->toBe('SUMMER-SALE_2');
});

test('5b. codes with spaces or symbols, or over 50 characters, are rejected', function (string $code) {
    $this->postJson(route('v1.admin.coupons.store'), couponPayload(['code' => $code]))
        ->assertUnprocessable()->assertJsonValidationErrors(['code']);
})->with([
    'space' => ['SAVE 10'],
    'symbol' => ['SAVE10!'],
    '51 chars' => [str_repeat('A', 51)],
]);

// ───────────────────────────── 6–8: spend, limits, expiry

test('6. max_spend below min_spend → 422 under max_spend; equal is fine', function () {
    $this->postJson(route('v1.admin.coupons.store'), couponPayload(['min_spend' => '100', 'max_spend' => '99.99']))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['max_spend' => 'The maximum spend must be greater than or equal to the minimum spend.']);

    $this->postJson(route('v1.admin.coupons.store'), couponPayload(['min_spend' => '100', 'max_spend' => '100']))
        ->assertCreated();
});

test('7. empty limits are stored as null and the resource shows "Unlimited"; 0 is rejected', function () {
    $id = $this->postJson(route('v1.admin.coupons.store'), couponPayload(['usage_limit' => '', 'per_user_limit' => null]))
        ->assertCreated()
        ->assertJsonPath('data.usage_limit', null)
        ->assertJsonPath('data.usage_limit_display', 'Unlimited')
        ->assertJsonPath('data.per_user_limit', null)
        ->assertJsonPath('data.per_user_limit_display', 'Unlimited')
        ->json('data.id');

    expect(Coupon::find($id)->only(['usage_limit', 'per_user_limit']))->toBe(['usage_limit' => null, 'per_user_limit' => null]);

    $this->postJson(route('v1.admin.coupons.store'), couponPayload(['code' => 'ZERO', 'usage_limit' => 0, 'per_user_limit' => 0]))
        ->assertUnprocessable()->assertJsonValidationErrors(['usage_limit', 'per_user_limit']);
});

test('8. a past expiry date on create → 422; today and no date are fine', function () {
    $this->postJson(route('v1.admin.coupons.store'), couponPayload(['expiry_date' => now()->subDay()->toDateString()]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['expiry_date' => 'The expiry date cannot be in the past.']);

    $this->postJson(route('v1.admin.coupons.store'), couponPayload(['code' => 'TODAY', 'expiry_date' => now()->toDateString()]))
        ->assertCreated()->assertJsonPath('data.expiry_date', now()->toDateString());
    $this->postJson(route('v1.admin.coupons.store'), couponPayload(['code' => 'NODATE', 'expiry_date' => null]))
        ->assertCreated()->assertJsonPath('data.expiry_date', null);
});

test('8b. on update an already-past expiry may be kept unchanged, but not changed to another past date', function () {
    $coupon = Coupon::factory()->expired()->create(['code' => 'OLD10']);
    $past = $coupon->expiry_date->toDateString();

    $this->putJson(route('v1.admin.coupons.update', $coupon), couponPayload(['code' => 'OLD10', 'name' => 'Kept', 'expiry_date' => $past]))
        ->assertOk()
        ->assertJsonPath('data.expiry_date', $past)
        ->assertJsonPath('data.is_expired', true);

    $this->putJson(route('v1.admin.coupons.update', $coupon), couponPayload(['code' => 'OLD10', 'expiry_date' => now()->subDays(2)->toDateString()]))
        ->assertUnprocessable()->assertJsonValidationErrors(['expiry_date']);
});

// ───────────────────────────── 9: auto generate

test('9. auto-generated codes are unique across 50 consecutive generations', function () {
    $codes = collect(range(1, 50))->map(fn () => $this->getJson(route('v1.admin.coupons.generate-code'))
        ->assertOk()->json('data.code'));

    expect($codes->unique())->toHaveCount(50);
    $codes->each(fn (string $code) => expect($code)->toMatch('/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8,10}$/'));

    // Saving 50 coupons in Auto Generate mode with no code: every stored code is unique too.
    foreach (range(1, 50) as $i) {
        $this->postJson(route('v1.admin.coupons.store'), couponPayload(['code_mode' => 'auto', 'code' => null, 'name' => "Auto $i"]))
            ->assertCreated();
    }
    expect(Coupon::distinct()->count('code'))->toBe(50);
});

test('9b. an auto-generated code that collides is replaced instead of failing; a manual one fails', function () {
    Coupon::factory()->create(['code' => 'ABCDEFGH']);

    $code = $this->postJson(route('v1.admin.coupons.store'), couponPayload(['code_mode' => 'auto', 'code' => 'ABCDEFGH']))
        ->assertCreated()
        ->json('data.code');
    expect($code)->not->toBe('ABCDEFGH')->toMatch('/^[A-HJ-NP-Z2-9]{8,10}$/');

    $this->postJson(route('v1.admin.coupons.store'), couponPayload(['code_mode' => 'manual', 'code' => 'ABCDEFGH']))
        ->assertUnprocessable()->assertJsonValidationErrors(['code']);
});

// ───────────────────────────── 10–12: list query

test('10. search matches name and code; type and status filters narrow; filters combine', function () {
    $this->seed(CouponSeeder::class);
    $index = fn (array $query) => $this->getJson(route('v1.admin.coupons.index', $query))->assertOk();

    expect(listedCodes($index(['search' => 'summer'])))->toBe(['SUMMER20']) // by name "Summer Sale"
        ->and(listedCodes($index(['search' => 'fri30'])))->toBe(['BLACKFRI30']) // by code
        ->and(listedCodes($index(['search' => 'welcome'])))->toBe(['WELCOME50', 'WELCOME10']);

    expect($index(['type' => 'flat'])->json('meta.total'))->toBe(5)
        ->and($index(['type' => 'percentage'])->json('meta.total'))->toBe(7)
        ->and(listedCodes($index(['status' => 'inactive'])))->toBe(['AUTO5OFF'])
        ->and($index(['status' => 'active'])->json('meta.total'))->toBe(11)
        ->and(listedCodes($index(['type' => 'flat', 'status' => 'active', 'search' => 'welcome'])))->toBe(['WELCOME10'])
        ->and(listedCodes($index(['search' => 'zzz-nothing'])))->toBe([]);

    $types = collect($index(['type' => 'flat', 'per_page' => 100])->json('data'))->pluck('type')->unique()->all();
    expect($types)->toBe(['flat']);

    // Expiry range (inclusive); coupons without an expiry date never match a range.
    $in14 = now()->addDays(14)->toDateString();
    expect(listedCodes($index(['expiry_from' => $in14, 'expiry_to' => $in14])))->toBe(['FLASH15'])
        ->and($index(['expiry_from' => now()->toDateString()])->json('meta.total'))->toBe(11);

    $this->getJson(route('v1.admin.coupons.index', ['type' => 'bogus', 'status' => 'maybe', 'expiry_from' => '2027-01-02', 'expiry_to' => '2027-01-01']))
        ->assertUnprocessable()->assertJsonValidationErrors(['type', 'status', 'expiry_to']);
});

test('11. sorting by a column outside the whitelist is rejected with 422 (never reaches SQL)', function (string $sort) {
    $this->getJson(route('v1.admin.coupons.index', ['sort' => $sort]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['sort' => 'The list cannot be sorted by this column.']);
})->with([
    'unlisted column' => ['value'],
    'hidden column' => ['deleted_at'],
    'injection attempt' => ['name; DROP TABLE coupons'],
]);

test('11b. whitelisted sorts work in both directions; the default is id ascending', function () {
    $this->seed(CouponSeeder::class);
    $codes = fn (array $query) => listedCodes($this->getJson(route('v1.admin.coupons.index', $query + ['per_page' => 100]))->assertOk());

    expect($codes([]))->toBe(Coupon::orderBy('id')->pluck('code')->all())
        ->and($codes(['sort' => 'code']))->toBe(Coupon::orderBy('code')->pluck('code')->all())
        ->and($codes(['sort' => 'code', 'direction' => 'desc']))->toBe(Coupon::orderByDesc('code')->pluck('code')->all())
        ->and($codes(['sort' => 'name', 'direction' => 'desc'])[0])->toBe('WELCOME50');

    $types = collect($this->getJson(route('v1.admin.coupons.index', ['sort' => 'type', 'per_page' => 100]))->json('data'))->pluck('type');
    expect($types->all())->toBe($types->sort()->values()->all());

    $dates = collect($this->getJson(route('v1.admin.coupons.index', ['sort' => 'expiry_date', 'direction' => 'desc', 'per_page' => 100]))->json('data'))
        ->pluck('expiry_date')->filter()->values();
    expect($dates->all())->toBe($dates->sortDesc()->values()->all());
});

test('12. pagination meta is correct for 12 rows at per_page=10; # can continue across pages', function () {
    $this->seed(CouponSeeder::class);

    $this->getJson(route('v1.admin.coupons.index', ['per_page' => 10]))
        ->assertOk()
        ->assertJsonCount(10, 'data')
        ->assertJsonPath('meta.total', 12)
        ->assertJsonPath('meta.per_page', 10)
        ->assertJsonPath('meta.current_page', 1)
        ->assertJsonPath('meta.last_page', 2)
        ->assertJsonPath('meta.from', 1)
        ->assertJsonPath('meta.to', 10);

    $this->getJson(route('v1.admin.coupons.index', ['per_page' => 10, 'page' => 2, 'sort' => 'name']))
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.current_page', 2)
        ->assertJsonPath('meta.from', 11)
        ->assertJsonPath('meta.to', 12)
        ->assertJson(fn ($json) => $json->where('links.prev', fn (string $url) => str_contains($url, 'sort=name') && str_contains($url, 'page=1'))->etc());

    $this->getJson(route('v1.admin.coupons.index'))->assertJsonPath('meta.per_page', 10); // default
    $this->getJson(route('v1.admin.coupons.index', ['per_page' => 101]))->assertUnprocessable()->assertJsonValidationErrors(['per_page']);
    $this->getJson(route('v1.admin.coupons.index', ['per_page' => 100]))->assertOk()->assertJsonCount(12, 'data');
});

// ───────────────────────────── 13–14: toggle, delete

test('13. toggle-status flips is_active and persists', function () {
    $coupon = Coupon::factory()->create();

    $this->patchJson(route('v1.admin.coupons.toggle-status', $coupon))->assertOk()->assertJsonPath('data.is_active', false);
    expect($coupon->refresh()->is_active)->toBeFalse();

    $this->patchJson(route('v1.admin.coupons.toggle-status', $coupon))->assertOk()->assertJsonPath('data.is_active', true);
    expect($coupon->refresh()->is_active)->toBeTrue();
});

test('14. delete soft-deletes and the row disappears from the index and show', function () {
    $coupon = Coupon::factory()->create(['code' => 'BYEBYE']);
    Coupon::factory()->create(['code' => 'STAYS']);

    $this->deleteJson(route('v1.admin.coupons.destroy', $coupon))->assertNoContent();

    expect(Coupon::find($coupon->id))->toBeNull()
        ->and(Coupon::withTrashed()->find($coupon->id)->trashed())->toBeTrue();
    expect(listedCodes($this->getJson(route('v1.admin.coupons.index'))))->toBe(['STAYS']);
    $this->getJson(route('v1.admin.coupons.show', $coupon))->assertNotFound();
    $this->deleteJson(route('v1.admin.coupons.destroy', $coupon))->assertNotFound();
});

// ───────────────────────────── 15: access

test('15a. a company user gets 403 on every coupon route', function (string $method, string $route, bool $needsCoupon) {
    $coupon = Coupon::factory()->create();
    $this->actingAs(User::factory()->company()->create(), 'web');

    $this->json($method, route($route, $needsCoupon ? $coupon : []), couponPayload())
        ->assertForbidden();

    expect(Coupon::find($coupon->id))->not->toBeNull()
        ->and(Coupon::count())->toBe(1);
})->with('coupon routes');

test('15b. unauthenticated requests get 401 on every coupon route', function (string $method, string $route, bool $needsCoupon) {
    $coupon = Coupon::factory()->create();
    auth()->guard('web')->logout();

    $this->json($method, route($route, $needsCoupon ? $coupon : []), couponPayload())
        ->assertUnauthorized();
})->with('coupon routes');

dataset('coupon routes', [
    'index' => ['GET', 'v1.admin.coupons.index', false],
    'store' => ['POST', 'v1.admin.coupons.store', false],
    'show' => ['GET', 'v1.admin.coupons.show', true],
    'update' => ['PUT', 'v1.admin.coupons.update', true],
    'destroy' => ['DELETE', 'v1.admin.coupons.destroy', true],
    'toggle-status' => ['PATCH', 'v1.admin.coupons.toggle-status', true],
    'generate-code' => ['GET', 'v1.admin.coupons.generate-code', false],
]);
