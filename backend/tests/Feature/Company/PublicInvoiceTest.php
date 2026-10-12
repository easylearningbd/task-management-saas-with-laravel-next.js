<?php

use App\Models\Client;
use App\Models\Company;
use App\Models\Invoice;
use App\Models\Project;
use App\Models\Task;
use App\Models\Tax;
use App\Models\User;
use App\Services\CompanySetupService;
use App\Services\InvoiceService;
use App\Services\PaymentService;
use App\Support\Tenancy\Tenancy;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;

/* Invoices Phase 2 — test 13: GET /api/v1/public/invoices/{token}, the share page's data. No auth;
   the token is the only key; exactly what the document shows — never an id, the token, another
   invoice or anything about the company beyond its billing block. */

beforeEach(function () {
    Carbon::setTestNow('2026-10-12 12:00:00');
    $this->company = User::factory()->company()->create(['name' => 'Tech Solutions Inc.', 'email' => 'company@example.com']);
    $this->other = User::factory()->company()->create();
    $model = Company::query()->findOrFail($this->company->id);
    app(CompanySetupService::class)->seedInvoiceSettings($model);
    app(CompanySetupService::class)->seedTaxes($model);

    [$this->invoice, $this->sibling] = Tenancy::instance()->runAs($this->company, function () {
        $client = Client::factory()->create(['name' => 'Google Cloud Platform', 'email' => 'business@google.com', 'phone' => '+1-403-600-2030', 'address' => '3010 Broadway, Los Angeles, NY 39548']);
        $project = Project::factory()->create(['client_id' => $client->id, 'name' => 'Mobile-First Application Suite']);
        $task = Task::factory()->for($project)->create();
        $make = fn (string $price) => app(InvoiceService::class)->create([
            'client_id' => $client->id, 'project_id' => $project->id, 'invoice_date' => '2026-10-01', 'due_date' => '2026-10-31',
            'discount_amount' => '10.00', 'notes' => 'Thank you for your business!', 'tax_ids' => [Tax::query()->named('VAT')->value('id')],
            'items' => [['type' => 'task', 'task_id' => $task->id, 'description' => 'API Integration', 'quantity' => '2', 'price' => $price]],
        ]);
        $invoice = $make('100.00');
        app(PaymentService::class)->add($invoice, ['amount' => '50.00', 'payment_type' => 'cash']);

        return [$invoice->fresh(), $make('999.00')];
    });
});

afterEach(fn () => Carbon::setTestNow());

/** Every key of a decoded JSON tree, at any depth. */
function jsonKeys(array $data): array
{
    $keys = [];
    foreach ($data as $key => $value) {
        $keys[] = (string) $key;
        if (is_array($value)) {
            $keys = [...$keys, ...jsonKeys($value)];
        }
    }

    return $keys;
}

test('13a. a valid token, signed out → the invoice as the document shows it', function () {
    $response = $this->getJson(route('v1.public.invoices.show', $this->invoice->public_token))->assertOk();

    $response->assertExactJson(['data' => [
        'invoice_number' => 'INV-2026-0001',
        'status' => 'partial',
        'status_label' => 'Partial',
        'invoice_date' => '2026-10-01',
        'due_date' => '2026-10-31',
        'billed_from' => [
            'company_name' => 'Tech Solutions Inc.', 'email' => 'company@example.com', 'phone' => '+1-555-0123', 'address' => '123 Business Street',
            'city' => 'New York', 'state' => 'NY', 'zip' => '10001', 'country' => 'United States',
        ],
        'bill_to' => ['name' => 'Google Cloud Platform', 'email' => 'business@google.com', 'phone' => '+1-403-600-2030', 'address' => '3010 Broadway, Los Angeles, NY 39548'],
        'project' => ['name' => 'Mobile-First Application Suite'],
        'items' => [['description' => 'API Integration', 'quantity' => '2.00', 'price' => '100.00', 'total' => '200.00']],
        'subtotal' => '200.00',
        'discount_amount' => '10.00',
        'taxes' => [['name' => 'VAT', 'rate' => '10.00', 'amount' => '19.00']],
        'tax_amount' => '19.00',
        'total' => '209.00',
        'paid_amount' => '50.00',
        'balance_due' => '159.00',
        'notes' => 'Thank you for your business!',
    ]]);
});

test('13b. it never leaks an id, the token, another invoice or company data beyond the billing block', function () {
    $body = $this->getJson(route('v1.public.invoices.show', $this->invoice->public_token))->json();
    $keys = jsonKeys($body);
    $raw = json_encode($body);

    expect(array_filter($keys, fn (string $key) => $key === 'id' || str_ends_with($key, '_id') || str_contains($key, 'token') || str_contains($key, 'company_id')))->toBe([])
        ->and($raw)->not->toContain($this->invoice->public_token)
        ->and($raw)->not->toContain($this->sibling->invoice_number)
        ->and($raw)->not->toContain('999.00')
        ->and($raw)->not->toContain('plan')
        ->and(array_keys($body['data']['billed_from']))->toBe(['company_name', 'email', 'phone', 'address', 'city', 'state', 'zip', 'country']);
});

test('13c. a bad, malformed or deleted token → 404 (clean JSON, no stack trace); a signed-in other company sees the same as a guest', function () {
    $this->getJson(route('v1.public.invoices.show', str_repeat('A', 40)))->assertNotFound()->assertExactJson(['message' => 'Invoice not found.']);
    $this->getJson(route('v1.public.invoices.show', 'short'))->assertNotFound();
    $this->getJson(route('v1.public.invoices.show', 'bad-token-with-dashes-and-more-than-20'))->assertNotFound();

    // A signed-in company (any) opening the link gets the invoice — the token is the key, not the session.
    $this->actingAs($this->other->fresh(), 'web');
    $this->getJson(route('v1.public.invoices.show', $this->invoice->public_token))->assertOk()->assertJsonPath('data.invoice_number', 'INV-2026-0001');
    test()->flushSession();
    Auth::forgetGuards();

    Tenancy::instance()->runAs($this->company, fn () => app(InvoiceService::class)->delete($this->sibling));
    $this->getJson(route('v1.public.invoices.show', $this->sibling->public_token))->assertNotFound();
    expect(Invoice::withTrashed()->count())->toBe(0); // signed out: the tenant scope still hides everything
});
