<?php

use App\Enums\ClientStatus;
use App\Models\Client;
use App\Models\User;
use App\Support\Tenancy\Tenancy;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Auth;

/* /api/v1/clients — the first tenant-scoped module (PRD §6.7, CLAUDE.md §7). */

beforeEach(function () {
    $this->companyA = User::factory()->company()->create(['name' => 'Company A']);
    $this->companyB = User::factory()->company()->create(['name' => 'Company B']);
});

/** A valid Add Client payload. */
function clientPayload(array $overrides = []): array
{
    return [
        'name' => 'Acme Client',
        'email' => 'buyer@acme.test',
        'phone' => '+1-555-0100',
        'company_name' => 'Acme',
        'address' => '1 Main St, Springfield',
        'website' => 'https://acme.test',
        'status' => 'active',
        'notes' => null,
        ...$overrides,
    ];
}

/** Clients for a company, created the way seeders do. */
function clientsFor(User $company, int $count = 1, array $attributes = []): Collection
{
    return Tenancy::instance()->runAs($company, fn () => Client::factory()->count($count)->create($attributes));
}

/** Switch the signed-in company (Sanctum caches the user per guard). */
function signInAs(User $user): void
{
    Auth::forgetGuards();
    test()->actingAs($user, 'web');
}

// ───────────────────────────── create

test('1. create → 201, stored under the authenticated company', function () {
    signInAs($this->companyA);

    $response = $this->postJson(route('v1.clients.store'), clientPayload(['email' => '  Buyer@ACME.test ']))
        ->assertCreated()
        ->assertJsonPath('data.name', 'Acme Client')
        ->assertJsonPath('data.email', 'buyer@acme.test')
        ->assertJsonPath('data.initials', 'AC')
        ->assertJsonPath('data.website_host', 'acme.test')
        ->assertJsonPath('data.status_label', 'Active')
        ->assertJsonMissingPath('data.company_id');

    expect(DB::table('clients')->where('id', $response->json('data.id'))->value('company_id'))->toBe($this->companyA->id);
});

test('2. a company_id (or id) in the payload is ignored — stored under the authenticated company', function () {
    signInAs($this->companyA);

    $id = $this->postJson(route('v1.clients.store'), clientPayload(['company_id' => $this->companyB->id, 'id' => 999]))
        ->assertCreated()
        ->json('data.id');

    expect(DB::table('clients')->where('id', $id)->value('company_id'))->toBe($this->companyA->id)
        ->and($id)->not->toBe(999);
});

test('3. phone, company and address are required', function (string $field) {
    signInAs($this->companyA);

    $this->postJson(route('v1.clients.store'), clientPayload([$field => '']))
        ->assertUnprocessable()
        ->assertJsonValidationErrors([$field]);
})->with(['phone', 'company_name', 'address', 'name', 'email']);

test('4. email is unique within a company, but another company may use the same address', function () {
    clientsFor($this->companyA, 1, ['email' => 'shared@client.test']);

    signInAs($this->companyA);
    $this->postJson(route('v1.clients.store'), clientPayload(['email' => 'SHARED@client.test']))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email' => 'A client with this email address already exists.']);

    signInAs($this->companyB);
    $this->postJson(route('v1.clients.store'), clientPayload(['email' => 'shared@client.test']))->assertCreated();

    expect(DB::table('clients')->where('email', 'shared@client.test')->count())->toBe(2);
});

test('4b. a soft-deleted client\'s email still counts as taken in that company (no 500 from the unique index)', function () {
    $client = clientsFor($this->companyA, 1, ['email' => 'gone@client.test'])->first();
    signInAs($this->companyA);
    $this->deleteJson(route('v1.clients.destroy', $client))->assertNoContent();

    $this->postJson(route('v1.clients.store'), clientPayload(['email' => 'gone@client.test']))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});

test('5. updating while keeping its own email passes; taking a sibling\'s email does not', function () {
    [$mine, $sibling] = clientsFor($this->companyA, 2)->all();
    signInAs($this->companyA);

    $this->putJson(route('v1.clients.update', $mine), clientPayload(['name' => 'Renamed', 'email' => $mine->email]))
        ->assertOk()
        ->assertJsonPath('data.name', 'Renamed')
        ->assertJsonPath('data.email', $mine->email);

    $this->putJson(route('v1.clients.update', $mine), clientPayload(['email' => $sibling->email]))
        ->assertUnprocessable()
        ->assertJsonValidationErrors(['email']);
});

test('6. an invalid website is rejected; an empty one is allowed and stored as null', function () {
    signInAs($this->companyA);

    foreach (['not a url', 'acme.test', 'ftp://acme.test'] as $bad) {
        $this->postJson(route('v1.clients.store'), clientPayload(['website' => $bad]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['website']);
    }

    $this->postJson(route('v1.clients.store'), clientPayload(['website' => '']))
        ->assertCreated()
        ->assertJsonPath('data.website', null)
        ->assertJsonPath('data.website_host', null);
});

// ───────────────────────────── tenant isolation

test('7. company A cannot read, update, delete or toggle company B\'s client — all 404, nothing changes', function () {
    $theirs = clientsFor($this->companyB, 1, ['name' => 'B Client', 'status' => ClientStatus::Active])->first();
    signInAs($this->companyA);

    $this->getJson(route('v1.clients.show', $theirs))->assertNotFound();
    $this->putJson(route('v1.clients.update', $theirs), clientPayload(['name' => 'Hijacked']))->assertNotFound();
    $this->patchJson(route('v1.clients.toggle-status', $theirs))->assertNotFound();
    $this->deleteJson(route('v1.clients.destroy', $theirs))->assertNotFound();

    $row = DB::table('clients')->where('id', $theirs->id)->first();
    expect($row->name)->toBe('B Client')
        ->and($row->status)->toBe('active')
        ->and($row->deleted_at)->toBeNull();
});

test('8. company A\'s index never contains company B\'s clients, whatever the filters', function (array $query, bool $expectsMine) {
    clientsFor($this->companyA, 3, ['company_name' => 'Shared Corp']);
    clientsFor($this->companyB, 3, ['company_name' => 'Shared Corp']);
    clientsFor($this->companyB, 1, ['company_name' => 'Shared Corp', 'status' => ClientStatus::Inactive]);
    signInAs($this->companyA);

    $ids = collect($this->getJson(route('v1.clients.index', $query))->assertOk()->json('data'))->pluck('id')->sort()->values();
    $mine = DB::table('clients')->where('company_id', $this->companyA->id)->orderBy('id')->pluck('id');
    $theirs = DB::table('clients')->where('company_id', $this->companyB->id)->pluck('id');

    expect($ids->intersect($theirs))->toBeEmpty()
        // …and A gets exactly its own matching rows, so "no overlap" is never vacuous.
        ->and($ids->all())->toBe($expectsMine ? $mine->all() : []);
})->with([
    'no filters' => [[], true],
    'search' => [['search' => 'Shared'], true],
    'status inactive (A has none)' => [['status' => 'inactive'], false],
    'sorted, 100 per page' => [['sort' => 'company_name', 'direction' => 'desc', 'per_page' => 100], true],
    'date range' => [['created_from' => '2000-01-01', 'created_to' => '2999-12-31'], true],
]);

// ───────────────────────────── list

test('9. search matches name, email, company and phone; the status filter narrows', function () {
    Tenancy::instance()->runAs($this->companyA, function () {
        Client::factory()->create(['name' => 'Zeta Partners', 'email' => 'z@one.test', 'company_name' => 'One', 'phone' => '+1-111']);
        Client::factory()->create(['name' => 'Beta', 'email' => 'hello@zebra.test', 'company_name' => 'Two', 'phone' => '+1-222']);
        Client::factory()->create(['name' => 'Gamma', 'email' => 'g@three.test', 'company_name' => 'Zed Holdings', 'phone' => '+1-333']);
        Client::factory()->inactive()->create(['name' => 'Delta', 'email' => 'd@four.test', 'company_name' => 'Four', 'phone' => '+1-999-4444']);
    });
    signInAs($this->companyA);
    $names = fn (array $q) => collect($this->getJson(route('v1.clients.index', $q))->assertOk()->json('data'))->pluck('name')->sort()->values()->all();

    expect($names(['search' => 'zeta']))->toBe(['Zeta Partners'])          // name
        ->and($names(['search' => 'zebra']))->toBe(['Beta'])               // email
        ->and($names(['search' => 'zed hold']))->toBe(['Gamma'])           // company
        ->and($names(['search' => '999-44']))->toBe(['Delta'])             // phone
        ->and($names(['search' => '50%_']))->toBe([])                      // LIKE wildcards are literal
        ->and($names(['status' => 'inactive']))->toBe(['Delta'])
        ->and($names(['status' => 'active']))->toBe(['Beta', 'Gamma', 'Zeta Partners']);
});

test('10. a sort column outside the whitelist is rejected with 422; whitelisted ones sort', function () {
    clientsFor($this->companyA, 3);
    signInAs($this->companyA);

    foreach (['company_id', 'notes', 'password', 'name;drop table clients'] as $bad) {
        $this->getJson(route('v1.clients.index', ['sort' => $bad]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['sort']);
    }

    foreach (['name', 'email', 'company_name', 'status', 'created_at'] as $column) {
        foreach (['asc', 'desc'] as $direction) {
            $values = collect($this->getJson(route('v1.clients.index', ['sort' => $column, 'direction' => $direction]))->assertOk()->json('data'))
                ->pluck($column)->all();
            $sorted = $values;
            $direction === 'asc' ? sort($sorted) : rsort($sorted);
            expect($values)->toBe($sorted);
        }
    }
});

test('11. pagination: 12 clients at per_page=10 → two pages, numbering meta correct', function () {
    clientsFor($this->companyA, 12);
    clientsFor($this->companyB, 5);
    signInAs($this->companyA);

    $this->getJson(route('v1.clients.index', ['per_page' => 10]))
        ->assertOk()
        ->assertJsonCount(10, 'data')
        ->assertJsonPath('meta.total', 12)
        ->assertJsonPath('meta.per_page', 10)
        ->assertJsonPath('meta.current_page', 1)
        ->assertJsonPath('meta.last_page', 2)
        ->assertJsonPath('meta.from', 1)
        ->assertJsonPath('meta.to', 10);

    $this->getJson(route('v1.clients.index', ['per_page' => 10, 'page' => 2]))
        ->assertOk()
        ->assertJsonCount(2, 'data')
        ->assertJsonPath('meta.from', 11)
        ->assertJsonPath('meta.to', 12);

    $this->getJson(route('v1.clients.index', ['per_page' => 101]))->assertUnprocessable();
    $this->getJson(route('v1.clients.index'))->assertJsonPath('meta.per_page', 10);
});

// ───────────────────────────── toggle + delete

test('12. toggle-status flips and persists, both ways', function () {
    $client = clientsFor($this->companyA)->first();
    signInAs($this->companyA);

    $this->patchJson(route('v1.clients.toggle-status', $client))->assertOk()->assertJsonPath('data.status', 'inactive');
    expect(DB::table('clients')->where('id', $client->id)->value('status'))->toBe('inactive');

    $this->patchJson(route('v1.clients.toggle-status', $client))->assertOk()->assertJsonPath('data.status', 'active');
    expect(DB::table('clients')->where('id', $client->id)->value('status'))->toBe('active');
});

test('13. delete soft-deletes: gone from the index and show, row kept; still invisible to company B', function () {
    $client = clientsFor($this->companyA)->first();
    signInAs($this->companyA);

    $this->deleteJson(route('v1.clients.destroy', $client))->assertNoContent();

    expect(DB::table('clients')->where('id', $client->id)->value('deleted_at'))->not->toBeNull();
    $this->getJson(route('v1.clients.index'))->assertJsonPath('meta.total', 0);
    $this->getJson(route('v1.clients.show', $client))->assertNotFound();

    signInAs($this->companyB);
    $this->getJson(route('v1.clients.show', $client))->assertNotFound();
    $this->getJson(route('v1.clients.index'))->assertJsonPath('meta.total', 0);
});

// ───────────────────────────── access

test('14. a guest gets 401 and a super admin 403 on every client route', function (string $method, string $route, bool $bound) {
    $client = clientsFor($this->companyA)->first();
    $url = route($route, $bound ? $client : []);

    $this->json($method, $url, clientPayload())->assertUnauthorized();

    // role:company runs before route-model binding (bootstrap/app.php priority list), so the
    // {client} routes answer 403 too instead of resolving the client first.
    signInAs(User::factory()->superAdmin()->create());
    $this->json($method, $url, clientPayload())->assertForbidden()->assertJsonStructure(['message']);

    $row = DB::table('clients')->where('id', $client->id)->first();
    expect($row->deleted_at)->toBeNull()
        ->and($row->name)->toBe($client->name)
        ->and($row->status)->toBe('active');
})->with([
    'index' => ['GET', 'v1.clients.index', false],
    'store' => ['POST', 'v1.clients.store', false],
    'show' => ['GET', 'v1.clients.show', true],
    'update' => ['PUT', 'v1.clients.update', true],
    'destroy' => ['DELETE', 'v1.clients.destroy', true],
    'toggle' => ['PATCH', 'v1.clients.toggle-status', true],
]);

test('initials are the first letters of the first and last words, as in the screenshot', function (string $name, string $initials) {
    $client = clientsFor($this->companyA, 1, ['name' => $name])->first();
    signInAs($this->companyA);

    $this->getJson(route('v1.clients.show', $client))->assertJsonPath('data.initials', $initials);
})->with([
    ['Amazon Web Services', 'AS'],
    ['Google Cloud Platform', 'GP'],
    ['Netflix Inc', 'NI'],
    ['Sarah Johnson', 'SJ'],
    ['madonna', 'MA'],
]);

test('the resource exposes the derived fields and never the owner', function () {
    $client = clientsFor($this->companyA, 1, ['name' => 'Microsoft Corporation', 'website' => 'https://www.microsoft.com/en-us', 'notes' => 'Key account'])->first();
    signInAs($this->companyA);

    $this->getJson(route('v1.clients.show', $client))
        ->assertOk()
        ->assertJsonPath('data.initials', 'MC')
        ->assertJsonPath('data.website_host', 'www.microsoft.com')
        ->assertJsonPath('data.notes', 'Key account')
        ->assertJsonMissingPath('data.company_id')
        ->assertJsonMissingPath('data.deleted_at');
});
