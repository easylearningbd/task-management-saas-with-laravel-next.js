<?php

use App\Models\Client;
use App\Models\Company;
use App\Models\Invoice;
use App\Models\Project;
use App\Models\ProjectItem;
use App\Models\Task;
use App\Models\Tax;
use App\Models\User;
use App\Services\CompanySetupService;
use App\Services\InvoiceService;
use App\Services\PaymentService;
use App\Support\Tenancy\Tenancy;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/* Invoices Phase 2 — the invoice API (PRD §6.8): create / update / delete with every amount computed
   on the server (tests 1–5, 11, 12), the list (filters, sorts, no N+1), the taxes and billing-details
   endpoints, tenant isolation (14) and roles (15). Payments: InvoicePaymentTest. Public page:
   PublicInvoiceTest. */

beforeEach(function () {
    Carbon::setTestNow('2026-10-12 12:00:00');
    $this->companyA = User::factory()->company()->create(['name' => 'Alpha Co', 'email' => 'alpha@example.com']);
    $this->companyB = User::factory()->company()->create(['name' => 'Beta Co', 'email' => 'beta@example.com']);
    $this->a = invWorld($this->companyA);
    $this->b = invWorld($this->companyB);
});

afterEach(fn () => Carbon::setTestNow());

/**
 * A company's invoicing world: the default taxes and billing details, two clients, a project for
 * each, two items and two tasks on the first project.
 *
 * @return array<string, mixed>
 */
function invWorld(User $company): array
{
    $setup = app(CompanySetupService::class);
    $model = Company::query()->findOrFail($company->id);
    $setup->seedTaxes($model);
    $setup->seedInvoiceSettings($model);

    return Tenancy::instance()->runAs($company, function () {
        $client = Client::factory()->create(['name' => 'Main Client']);
        $otherClient = Client::factory()->create(['name' => 'Second Client']);
        $project = Project::factory()->create(['client_id' => $client->id, 'name' => 'Main Project']);
        $otherProject = Project::factory()->create(['client_id' => $otherClient->id, 'name' => 'Second Project']);

        return [
            'client' => $client,
            'otherClient' => $otherClient,
            'project' => $project,
            'otherProject' => $otherProject,
            'itemA' => ProjectItem::factory()->for($project)->create(['name' => 'Design', 'default_price' => '113.00']),
            'itemB' => ProjectItem::factory()->for($project)->create(['name' => 'Build', 'default_price' => '155.00']),
            'taskA' => Task::factory()->for($project)->create(['title' => 'Kick-off']),
            'otherTask' => Task::factory()->for($otherProject)->create(['title' => 'Elsewhere']),
            'vat' => Tax::query()->named('VAT')->first(),
            'sales' => Tax::query()->named('Sales Tax')->first(),
        ];
    });
}

/** @return array<string, mixed> */
function invPayload(array $w, array $overrides = []): array
{
    return [
        'client_id' => $w['client']->id,
        'project_id' => $w['project']->id,
        'invoice_date' => '2026-10-12',
        'due_date' => '2026-11-11',
        'discount_amount' => '0',
        'tax_ids' => [],
        'notes' => 'Thank you for your business!',
        'items' => [
            ['type' => 'item', 'project_item_id' => $w['itemA']->id, 'description' => 'Design work', 'quantity' => '5', 'price' => '113.00'],
        ],
        ...$overrides,
    ];
}

function invActAs(User $user): void
{
    test()->flushSession();
    Auth::forgetGuards();
    test()->actingAs($user->fresh(), 'web');
}

/** Creates through the service in `$company`'s context. */
function invCreate(User $company, array $data): Invoice
{
    return Tenancy::instance()->runAs($company, fn () => app(InvoiceService::class)->create($data));
}

test('1. create computes the lines, subtotal, discount, taxes on (subtotal − discount), total and balance — to the cent', function () {
    invActAs($this->companyA);
    $response = $this->postJson(route('v1.invoices.store'), invPayload($this->a, [
        'discount_amount' => '254.00',
        'tax_ids' => [$this->a['vat']->id, $this->a['sales']->id],
        'items' => [
            ['type' => 'item', 'project_item_id' => $this->a['itemA']->id, 'description' => 'Deployment Support', 'quantity' => '5', 'price' => '113.00'],
            ['type' => 'item', 'project_item_id' => $this->a['itemA']->id, 'description' => 'Deployment Support', 'quantity' => '12', 'price' => '108.00'],
            ['type' => 'task', 'task_id' => $this->a['taskA']->id, 'description' => '', 'quantity' => '2.5', 'price' => '33.33'],
        ],
    ]))->assertCreated();

    // Lines: 565.00 + 1296.00 + 83.325 → 83.33 = 1944.33; taxable 1944.33 − 254.00 = 1690.33;
    // VAT 10% = 169.033 → 169.03; Sales Tax 5% = 84.5165 → 84.52; tax 253.55; total 1943.88.
    $response->assertJsonPath('data.subtotal', '1944.33')
        ->assertJsonPath('data.discount_amount', '254.00')
        ->assertJsonPath('data.tax_amount', '253.55')
        ->assertJsonPath('data.total', '1943.88')
        ->assertJsonPath('data.paid_amount', '0.00')
        ->assertJsonPath('data.balance_due', '1943.88')
        ->assertJsonPath('data.tax_rate', '15.00')
        ->assertJsonPath('data.status', 'draft')
        ->assertJsonPath('data.invoice_number', 'INV-2026-0001')
        ->assertJsonPath('data.items.0.total', '565.00')
        ->assertJsonPath('data.items.1.total', '1296.00')
        ->assertJsonPath('data.items.2.total', '83.33')
        ->assertJsonPath('data.items.2.description', 'Kick-off') // empty → the task's title
        ->assertJsonPath('data.taxes', [
            ['tax_id' => $this->a['vat']->id, 'name' => 'VAT', 'rate' => '10.00', 'amount' => '169.03'],
            ['tax_id' => $this->a['sales']->id, 'name' => 'Sales Tax', 'rate' => '5.00', 'amount' => '84.52'],
        ]);
    expect(strlen($response->json('data.public_token')))->toBe(40)
        ->and(DB::table('invoices')->value('company_id'))->toBe($this->companyA->id);
});

test('2. client-supplied totals are ignored — every amount is recomputed from the lines', function () {
    invActAs($this->companyA);
    $id = $this->postJson(route('v1.invoices.store'), invPayload($this->a, [
        'subtotal' => '1.00', 'tax_amount' => '9999', 'total' => '0.01', 'paid_amount' => '565.00', 'balance_due' => '0', 'status' => 'paid',
        'invoice_number' => 'HACK-1', 'public_token' => 'x', 'company_id' => $this->companyB->id,
    ]))->assertCreated()->assertJsonPath('data.total', '565.00')->json('data.id');

    $row = DB::table('invoices')->find($id);
    $money = fn ($value): string => bcadd((string) $value, '0', 2); // SQLite returns numbers
    expect([$money($row->subtotal), $money($row->total), $money($row->paid_amount), $money($row->balance_due), $row->status, $row->company_id, $row->invoice_number])
        ->toBe(['565.00', '565.00', '0.00', '565.00', 'draft', $this->companyA->id, 'INV-2026-0001']);
});

test('3. a project of another client → 422; a client, project, item, task or tax of another company → 422', function () {
    invActAs($this->companyA);
    $store = fn (array $overrides) => $this->postJson(route('v1.invoices.store'), invPayload($this->a, $overrides));

    $store(['project_id' => $this->a['otherProject']->id])->assertUnprocessable()->assertJsonValidationErrors(['project_id' => 'The selected project doesn\'t belong to this client.']);
    $store(['client_id' => $this->b['client']->id])->assertUnprocessable()->assertJsonValidationErrors(['client_id']);
    $store(['project_id' => $this->b['project']->id])->assertUnprocessable()->assertJsonValidationErrors(['project_id']);
    $store(['tax_ids' => [$this->b['vat']->id]])->assertUnprocessable()->assertJsonValidationErrors(['tax_ids']);
    $store(['items' => [['type' => 'item', 'project_item_id' => $this->b['itemA']->id, 'quantity' => '1', 'price' => '1']]])->assertUnprocessable()->assertJsonValidationErrors(['items.0.project_item_id']);
    $store(['items' => [['type' => 'task', 'task_id' => $this->b['taskA']->id, 'quantity' => '1', 'price' => '1']]])->assertUnprocessable()->assertJsonValidationErrors(['items.0.task_id']);
    // An item / task of the company's OTHER project is refused too.
    $store(['items' => [['type' => 'task', 'task_id' => $this->a['otherTask']->id, 'quantity' => '1', 'price' => '1']]])->assertUnprocessable()->assertJsonValidationErrors(['items.0.task_id' => 'Choose one of this project\'s tasks.']);
    expect(DB::table('invoices')->count())->toBe(0);
});

test('4. due date before the invoice date, no lines, quantity ≤ 0, a negative price, a discount above the subtotal → 422', function () {
    invActAs($this->companyA);
    $store = fn (array $overrides) => $this->postJson(route('v1.invoices.store'), invPayload($this->a, $overrides));
    $line = ['type' => 'item', 'project_item_id' => $this->a['itemA']->id, 'quantity' => '1', 'price' => '10'];

    $store(['due_date' => '2026-10-11'])->assertUnprocessable()->assertJsonValidationErrors(['due_date' => 'The due date can\'t be before the invoice date.']);
    $store(['items' => []])->assertUnprocessable()->assertJsonValidationErrors(['items' => 'Add at least one line item.']);
    $store(['items' => [[...$line, 'quantity' => '0']]])->assertUnprocessable()->assertJsonValidationErrors(['items.0.quantity']);
    $store(['items' => [[...$line, 'quantity' => '-2']]])->assertUnprocessable()->assertJsonValidationErrors(['items.0.quantity']);
    $store(['items' => [[...$line, 'price' => '-1']]])->assertUnprocessable()->assertJsonValidationErrors(['items.0.price']);
    $store(['items' => [[...$line, 'price' => '1.234']]])->assertUnprocessable()->assertJsonValidationErrors(['items.0.price']);
    $store(['items' => [['type' => 'item', 'quantity' => '1', 'price' => '1']]])->assertUnprocessable()->assertJsonValidationErrors(['items.0.project_item_id' => 'Choose an item.']);
    $store(['discount_amount' => '565.01'])->assertUnprocessable()->assertJsonValidationErrors(['discount_amount' => 'The discount can\'t be more than the subtotal ($565.00).']);
    $store(['discount_amount' => '565.00'])->assertCreated()->assertJsonPath('data.total', '0.00');
});

test('5. invoice numbers run per company per year, unique; two companies can hold the same number', function () {
    $a1 = invCreate($this->companyA, invPayload($this->a));
    $a2 = invCreate($this->companyA, invPayload($this->a));
    $b1 = invCreate($this->companyB, invPayload($this->b));
    Tenancy::instance()->runAs($this->companyA, fn () => app(InvoiceService::class)->delete($a2)); // a deleted number is never reused
    $a3 = invCreate($this->companyA, invPayload($this->a));
    Carbon::setTestNow('2027-01-02 09:00:00');
    $a4 = invCreate($this->companyA, invPayload($this->a, ['invoice_date' => '2027-01-02', 'due_date' => '2027-02-01']));

    expect([$a1->invoice_number, $a2->invoice_number, $a3->invoice_number, $a4->invoice_number, $b1->invoice_number])
        ->toBe(['INV-2026-0001', 'INV-2026-0002', 'INV-2026-0003', 'INV-2027-0001', 'INV-2026-0001'])
        ->and($a1->public_token)->not->toBe($b1->public_token);
});

test('11. editing or deleting a Partial or Paid invoice → 422; a Draft or Sent one is edited (recomputed) and deleted', function () {
    $draft = invCreate($this->companyA, invPayload($this->a));
    $sent = invCreate($this->companyA, invPayload($this->a));
    $partial = invCreate($this->companyA, invPayload($this->a));
    $paid = invCreate($this->companyA, invPayload($this->a));
    Tenancy::instance()->runAs($this->companyA, function () use ($sent, $partial, $paid) {
        app(InvoiceService::class)->markSent($sent);
        app(PaymentService::class)->add($partial, ['amount' => '100', 'payment_type' => 'cash']);
        app(PaymentService::class)->add($paid, ['amount' => '565.00', 'payment_type' => 'cash']);
    });
    invActAs($this->companyA);

    foreach ([$partial, $paid] as $locked) {
        $this->putJson(route('v1.invoices.update', $locked), invPayload($this->a))->assertUnprocessable()
            ->assertJsonValidationErrors(['invoice' => 'Paid and partially paid invoices can\'t be edited.']);
        $this->deleteJson(route('v1.invoices.destroy', $locked))->assertUnprocessable()
            ->assertJsonValidationErrors(['invoice' => 'Paid and partially paid invoices can\'t be deleted.']);
    }

    $this->putJson(route('v1.invoices.update', $draft), invPayload($this->a, [
        'items' => [['type' => 'item', 'project_item_id' => $this->a['itemB']->id, 'quantity' => '2', 'price' => '155.00']],
        'tax_ids' => [$this->a['vat']->id],
    ]))->assertOk()->assertJsonPath('data.subtotal', '310.00')->assertJsonPath('data.tax_amount', '31.00')
        ->assertJsonPath('data.total', '341.00')->assertJsonPath('data.balance_due', '341.00')->assertJsonCount(1, 'data.items')
        ->assertJsonPath('data.items.0.description', 'Build')->assertJsonPath('data.invoice_number', $draft->invoice_number);
    $this->putJson(route('v1.invoices.update', $sent), invPayload($this->a))->assertOk()->assertJsonPath('data.status', 'sent');

    $this->deleteJson(route('v1.invoices.destroy', $draft))->assertNoContent();
    $this->deleteJson(route('v1.invoices.destroy', $sent))->assertNoContent();
    expect(Invoice::withTrashed()->whereKey([$draft->id, $sent->id])->whereNotNull('deleted_at')->count())->toBe(2);
    $this->getJson(route('v1.invoices.show', $draft))->assertNotFound();
});

test('12. tax name and rate are snapshotted — changing or deleting the tax later leaves the invoice as it was', function () {
    $invoice = invCreate($this->companyA, invPayload($this->a, ['tax_ids' => [$this->a['vat']->id]]));
    Tenancy::instance()->runAs($this->companyA, function () {
        $this->a['vat']->update(['name' => 'VAT (new)', 'rate' => '25.00']);
    });
    invActAs($this->companyA);

    $this->getJson(route('v1.invoices.show', $invoice))->assertOk()
        ->assertJsonPath('data.taxes.0.name', 'VAT')->assertJsonPath('data.taxes.0.rate', '10.00')->assertJsonPath('data.taxes.0.amount', '56.50')
        ->assertJsonPath('data.tax_amount', '56.50')->assertJsonPath('data.total', '621.50');

    Tenancy::instance()->runAs($this->companyA, fn () => $this->a['vat']->delete());
    $this->getJson(route('v1.invoices.show', $invoice))->assertJsonPath('data.taxes.0.name', 'VAT')->assertJsonPath('data.total', '621.50');
});

test('the list: filters (search, status, client, project, date range), the sort whitelist, overdue / editable flags, no N+1', function () {
    $one = invCreate($this->companyA, invPayload($this->a, ['invoice_date' => '2026-09-01', 'due_date' => '2026-09-30']));
    $two = invCreate($this->companyA, invPayload($this->a, ['client_id' => $this->a['otherClient']->id, 'project_id' => $this->a['otherProject']->id,
        'items' => [['type' => 'task', 'task_id' => $this->a['otherTask']->id, 'quantity' => '1', 'price' => '900']], 'invoice_date' => '2026-10-10', 'due_date' => '2026-12-01']));
    Tenancy::instance()->runAs($this->companyA, fn () => app(PaymentService::class)->add($two, ['amount' => '900', 'payment_type' => 'cash']));
    invCreate($this->companyB, invPayload($this->b)); // never listed for A
    invActAs($this->companyA);

    $numbers = fn (array $query) => collect($this->getJson(route('v1.invoices.index', $query))->assertOk()->json('data'))->pluck('invoice_number')->all();
    expect($numbers([]))->toBe([$two->invoice_number, $one->invoice_number]) // newest first
        ->and($numbers(['search' => 'second client']))->toBe([$two->invoice_number])
        ->and($numbers(['search' => '0001']))->toBe([$one->invoice_number])
        ->and($numbers(['status' => 'paid']))->toBe([$two->invoice_number])
        ->and($numbers(['client_id' => $this->a['client']->id]))->toBe([$one->invoice_number])
        ->and($numbers(['project_id' => $this->a['otherProject']->id]))->toBe([$two->invoice_number])
        ->and($numbers(['date_from' => '2026-10-01', 'date_to' => '2026-10-31']))->toBe([$two->invoice_number])
        ->and($numbers(['client_id' => $this->b['client']->id]))->toBe([])
        ->and($numbers(['overdue' => 1]))->toBe([$one->invoice_number]) // past due, unpaid; the paid one never is
        ->and($numbers(['overdue' => 0]))->toBe([$two->invoice_number, $one->invoice_number])
        ->and($numbers(['sort' => 'total', 'direction' => 'asc']))->toBe([$one->invoice_number, $two->invoice_number])
        ->and($numbers(['sort' => 'due_date', 'direction' => 'desc']))->toBe([$two->invoice_number, $one->invoice_number]);

    $this->getJson(route('v1.invoices.index', ['sort' => 'public_token']))->assertUnprocessable()->assertJsonValidationErrors(['sort']);
    $this->getJson(route('v1.invoices.index', ['date_from' => '2026-10-31', 'date_to' => '2026-10-01']))->assertUnprocessable()->assertJsonValidationErrors(['date_to']);

    $rows = collect($this->getJson(route('v1.invoices.index'))->json('data'))->keyBy('invoice_number');
    expect($rows[$one->invoice_number])->toMatchArray(['status' => 'draft', 'is_overdue' => true, 'can_edit' => true, 'balance_due' => '565.00', 'client' => ['id' => $this->a['client']->id, 'name' => 'Main Client', 'email' => $this->a['client']->email, 'initials' => $this->a['client']->initials]])
        ->and($rows[$two->invoice_number])->toMatchArray(['status' => 'paid', 'is_overdue' => false, 'can_edit' => false, 'balance_due' => '0.00', 'project' => ['id' => $this->a['otherProject']->id, 'name' => 'Second Project']]);

    // No N+1: the query count doesn't grow with the rows.
    $count = function (): int {
        DB::flushQueryLog();
        DB::enableQueryLog();
        $this->getJson(route('v1.invoices.index'))->assertOk();
        DB::disableQueryLog();

        return count(DB::getQueryLog());
    };
    $before = $count();
    foreach (range(1, 6) as $i) {
        invCreate($this->companyA, invPayload($this->a, ['client_id' => $i % 2 ? $this->a['client']->id : $this->a['otherClient']->id, 'project_id' => $i % 2 ? $this->a['project']->id : $this->a['otherProject']->id,
            'items' => [$i % 2 ? ['type' => 'item', 'project_item_id' => $this->a['itemA']->id, 'quantity' => '1', 'price' => '1'] : ['type' => 'task', 'task_id' => $this->a['otherTask']->id, 'quantity' => '1', 'price' => '1']]]));
    }
    expect($count())->toBe($before);
});

test('the taxes and billing-details endpoints: the company\'s own, validated, never another company\'s', function () {
    Tenancy::instance()->runAs($this->companyA, fn () => Tax::factory()->inactive()->create(['name' => 'Old Tax']));
    invActAs($this->companyA);

    $this->getJson(route('v1.taxes.index'))->assertOk()->assertJsonCount(3, 'data')
        ->assertJsonPath('data.0', ['id' => $this->a['sales']->id, 'name' => 'Sales Tax', 'rate' => '5.00', 'label' => 'Sales Tax (5%)']);

    $this->getJson(route('v1.settings.invoice-details.show'))->assertOk()->assertExactJson(['data' => [
        'company_name' => 'Alpha Co', 'email' => 'alpha@example.com', 'phone' => '+1-555-0123', 'address' => '123 Business Street',
        'city' => 'New York', 'state' => 'NY', 'zip' => '10001', 'country' => 'United States',
    ]]);
    $this->putJson(route('v1.settings.invoice-details.update'), ['company_name' => '', 'email' => 'nope'])->assertUnprocessable()->assertJsonValidationErrors(['company_name', 'email']);
    $this->putJson(route('v1.settings.invoice-details.update'), ['company_name' => 'Alpha Billing Ltd', 'email' => 'billing@alpha.test', 'phone' => '', 'address' => '9 Main St', 'city' => 'Boston', 'state' => 'MA', 'zip' => '02101', 'country' => 'United States'])
        ->assertOk()->assertJsonPath('data.company_name', 'Alpha Billing Ltd')->assertJsonPath('data.phone', null);

    invActAs($this->companyB);
    $this->getJson(route('v1.settings.invoice-details.show'))->assertJsonPath('data.company_name', 'Beta Co');
    $this->getJson(route('v1.taxes.index'))->assertJsonMissing(['id' => $this->a['vat']->id]);
});

test('a client with invoices can\'t be deleted (PRD §6.7)', function () {
    $invoice = invCreate($this->companyA, invPayload($this->a));
    Tenancy::instance()->runAs($this->companyA, fn () => Project::query()->whereKey($this->a['project']->id)->delete()); // the client's only project is gone
    invActAs($this->companyA);

    $this->deleteJson(route('v1.clients.destroy', $this->a['client']))->assertUnprocessable()
        ->assertJsonValidationErrors(['client' => 'This client has invoices, so it can\'t be deleted.']);
    expect($invoice->fresh())->not->toBeNull();
});

test('14. company A cannot read, update, delete or pay company B\'s invoice, nor touch its payments — all 404', function () {
    $theirs = invCreate($this->companyB, invPayload($this->b));
    $payment = Tenancy::instance()->runAs($this->companyB, fn () => app(PaymentService::class)->add($theirs, ['amount' => '10', 'payment_type' => 'cash']));
    invActAs($this->companyA);

    $this->getJson(route('v1.invoices.show', $theirs))->assertNotFound();
    $this->putJson(route('v1.invoices.update', $theirs), invPayload($this->a))->assertNotFound();
    $this->deleteJson(route('v1.invoices.destroy', $theirs))->assertNotFound();
    $this->getJson(route('v1.invoices.payments.index', $theirs))->assertNotFound();
    $this->postJson(route('v1.invoices.payments.store', $theirs), ['amount' => '1'])->assertNotFound();
    $this->deleteJson(route('v1.invoice-payments.destroy', $payment))->assertNotFound();
    $this->getJson(route('v1.invoices.index'))->assertOk()->assertJsonPath('meta.total', 0);

    expect(Tenancy::instance()->runAs($this->companyB, fn () => [$theirs->fresh()->paid_amount, $theirs->fresh()->deleted_at, $theirs->payments()->count()]))->toBe(['10.00', null, 1]);
});

test('15. a super admin gets 403 on every company invoice route; signed out → 401 on all but the public one', function () {
    $invoice = invCreate($this->companyA, invPayload($this->a));
    $payment = Tenancy::instance()->runAs($this->companyA, fn () => app(PaymentService::class)->add($invoice, ['amount' => '10', 'payment_type' => 'cash']));
    $routes = [
        ['getJson', route('v1.invoices.index')],
        ['postJson', route('v1.invoices.store')],
        ['getJson', route('v1.invoices.show', $invoice)],
        ['putJson', route('v1.invoices.update', $invoice)],
        ['deleteJson', route('v1.invoices.destroy', $invoice)],
        ['getJson', route('v1.invoices.payments.index', $invoice)],
        ['postJson', route('v1.invoices.payments.store', $invoice)],
        ['deleteJson', route('v1.invoice-payments.destroy', $payment)],
        ['getJson', route('v1.taxes.index')],
        ['getJson', route('v1.settings.invoice-details.show')],
        ['putJson', route('v1.settings.invoice-details.update')],
    ];

    invActAs(User::factory()->superAdmin()->create());
    foreach ($routes as [$method, $url]) {
        $this->{$method}($url)->assertForbidden();
    }

    test()->flushSession();
    Auth::forgetGuards();
    foreach ($routes as [$method, $url]) {
        $this->{$method}($url)->assertUnauthorized();
    }
    $this->getJson(route('v1.public.invoices.show', $invoice->public_token))->assertOk();
});
