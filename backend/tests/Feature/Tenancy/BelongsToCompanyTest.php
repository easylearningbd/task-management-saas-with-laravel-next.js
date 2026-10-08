<?php

use App\Models\User;
use App\Support\Tenancy\CrossTenant;
use App\Support\Tenancy\MissingCompanyContext;
use App\Support\Tenancy\Tenancy;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Symfony\Component\Finder\Finder;
use Tests\Fixtures\Tenancy\Widget;

/* BelongsToCompany — the multi-tenancy foundation (CLAUDE.md §7). A throwaway `Widget` model
   stands in for every future tenant table (clients, projects, invoices, …). */

beforeEach(function () {
    Schema::create('tenancy_widgets', function (Blueprint $table) {
        $table->id();
        $table->foreignId('company_id')->constrained('users')->cascadeOnDelete();
        $table->string('name');
        $table->timestamps();
    });

    $this->companyA = User::factory()->company()->create(['name' => 'Company A']);
    $this->companyB = User::factory()->company()->create(['name' => 'Company B']);

    // Seed each company's rows the way seeders and jobs will: inside an explicit context.
    $this->a1 = Tenancy::instance()->runAs($this->companyA, fn () => Widget::create(['name' => 'A one']));
    $this->a2 = Tenancy::instance()->runAs($this->companyA, fn () => Widget::create(['name' => 'A two']));
    $this->b1 = Tenancy::instance()->runAs($this->companyB, fn () => Widget::create(['name' => 'B one']));
});

/** Reads the raw table, bypassing Eloquent entirely — the ground truth for assertions. */
function widgetRow(int $id): object
{
    return DB::table('tenancy_widgets')->where('id', $id)->first();
}

// ───────────────────────────── 1. create

test('1. creating as company A stores company_id = A, whatever the payload or a direct assignment says', function () {
    $this->actingAs($this->companyA, 'web');

    $mass = Widget::create(['name' => 'Mass', 'company_id' => $this->companyB->id]);   // not fillable → ignored
    $forced = new Widget(['name' => 'Forced']);
    $forced->company_id = $this->companyB->id;                                            // set by hand → overwritten
    $forced->save();
    $raw = Widget::forceCreate(['name' => 'Force', 'company_id' => $this->companyB->id]); // bypasses fillable → overwritten

    foreach ([$mass, $forced, $raw] as $widget) {
        expect(widgetRow($widget->id)->company_id)->toBe($this->companyA->id);
    }
});

// ───────────────────────────── 2. reads

test('2. querying as company A never returns company B rows — all, count, where, orWhere, pluck', function () {
    $this->actingAs($this->companyA, 'web');
    $b = $this->companyB->id;

    expect(Widget::pluck('name')->sort()->values()->all())->toBe(['A one', 'A two'])
        ->and(Widget::count())->toBe(2)
        ->and(Widget::where('name', 'B one')->exists())->toBeFalse()
        ->and(Widget::where('company_id', $b)->count())->toBe(0)
        // An OR cannot widen the scope: Eloquent nests the user's wheres before adding it.
        ->and(Widget::where('name', 'A one')->orWhere('company_id', $b)->pluck('name')->all())->toBe(['A one'])
        ->and(Widget::whereIn('id', [$this->a1->id, $this->b1->id])->pluck('id')->all())->toBe([$this->a1->id]);

    // And company B sees only its own.
    Auth::forgetGuards();
    $this->actingAs($this->companyB, 'web');
    expect(Widget::pluck('name')->all())->toBe(['B one']);
});

// ───────────────────────────── 3. find / binding

test('3. find() on company B\'s id as company A returns null; findOrFail throws; route binding answers 404', function () {
    $this->actingAs($this->companyA, 'web');

    expect(Widget::find($this->b1->id))->toBeNull()
        ->and(fn () => Widget::findOrFail($this->b1->id))->toThrow(ModelNotFoundException::class)
        ->and(Widget::find($this->a1->id)?->name)->toBe('A one');

    Route::middleware(['api', 'auth:sanctum'])
        ->get('/api/_tenancy-test/widgets/{widget}', fn (Widget $widget) => ['id' => $widget->id]);

    $this->getJson("/api/_tenancy-test/widgets/{$this->a1->id}")->assertOk()->assertJson(['id' => $this->a1->id]);
    $this->getJson("/api/_tenancy-test/widgets/{$this->b1->id}")->assertNotFound();
});

// ───────────────────────────── 4. no company in context

test('4a. console / guest (no company, no runAs): reads match nothing, creates throw', function () {
    expect(Auth::check())->toBeFalse()
        ->and(Widget::count())->toBe(0)                       // the rows exist…
        ->and(DB::table('tenancy_widgets')->count())->toBe(3) // …but are never "everyone's"
        ->and(Widget::find($this->a1->id))->toBeNull()
        ->and(fn () => Widget::create(['name' => 'Orphan']))->toThrow(MissingCompanyContext::class);
});

test('4b. a signed-in super admin is not a tenant: reads match nothing, creates throw', function () {
    $this->actingAs(User::factory()->superAdmin()->create(), 'web');

    expect(Widget::count())->toBe(0)
        ->and(fn () => Widget::create(['name' => 'Admin made']))->toThrow(MissingCompanyContext::class);
});

test('4c. runAs() gives seeders and jobs an explicit company, nests, and restores the previous context', function () {
    $tenancy = Tenancy::instance();

    $names = $tenancy->runAs($this->companyA, function () use ($tenancy) {
        $inner = $tenancy->runAs($this->companyB->id, fn () => Widget::pluck('name')->all());

        return [Widget::pluck('name')->sort()->values()->all(), $inner, $tenancy->companyId()];
    });

    expect($names)->toBe([['A one', 'A two'], ['B one'], $this->companyA->id])
        ->and($tenancy->companyId())->toBeNull(); // back to "no company" afterwards

    // Restored even when the callback throws.
    try {
        $tenancy->runAs($this->companyA, fn () => throw new RuntimeException('boom'));
    } catch (RuntimeException) {
    }
    expect($tenancy->companyId())->toBeNull();

    // updateOrCreate inside runAs is idempotent and tenant-local — exactly what ClientSeeder will do.
    $tenancy->runAs($this->companyA, fn () => Widget::updateOrCreate(['name' => 'A one'], ['name' => 'A one']));
    expect(DB::table('tenancy_widgets')->where('name', 'A one')->count())->toBe(1);
});

test('4d. runAs() only accepts a company account', function (Closure $who) {
    expect(fn () => Tenancy::instance()->runAs($who(), fn () => Widget::count()))
        ->toThrow(MissingCompanyContext::class);
})->with([
    'a super admin' => [fn () => User::factory()->superAdmin()->create()],
    'a missing id' => [fn () => 999_999],
]);

// ───────────────────────────── escape hatch

test('CrossTenant reads every company from admin / system code, and refuses inside any company context', function () {
    // Console / system: allowed.
    expect(CrossTenant::query(Widget::class)->count())->toBe(3);

    // Super admin: allowed.
    $this->actingAs(User::factory()->superAdmin()->create(), 'web');
    expect(CrossTenant::query(Widget::class)->where('company_id', $this->companyB->id)->pluck('name')->all())->toBe(['B one']);

    // Inside runAs: refused.
    expect(fn () => Tenancy::instance()->runAs($this->companyA, fn () => CrossTenant::query(Widget::class)->count()))
        ->toThrow(MissingCompanyContext::class);

    // A signed-in company (or an impersonated one — the session's user is the company): refused.
    Auth::forgetGuards();
    $this->actingAs($this->companyA, 'web');
    expect(fn () => CrossTenant::query(Widget::class)->count())->toThrow(MissingCompanyContext::class);
});

// ───────────────────────────── immutability + static guard

test('company_id can never change after create', function () {
    $this->actingAs($this->companyA, 'web');
    $widget = Widget::findOrFail($this->a1->id);
    $widget->company_id = $this->companyB->id;

    expect(fn () => $widget->save())->toThrow(MissingCompanyContext::class)
        ->and(widgetRow($this->a1->id)->company_id)->toBe($this->companyA->id);
});

test('company controllers never bypass the tenant scope', function () {
    $offenders = [];
    foreach (Finder::create()->files()->name('*.php')->in(app_path('Http/Controllers/Api/V1/Company')) as $file) {
        if (preg_match('/withoutGlobalScopes?\s*\(|CrossTenant|Tenancy::instance\(\)->runAs/', $file->getContents())) {
            $offenders[] = $file->getRelativePathname();
        }
    }

    expect($offenders)->toBe([]);
});
