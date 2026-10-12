<?php

use App\Models\Client;
use App\Models\Invoice;
use App\Models\Project;
use App\Models\ProjectItem;
use App\Models\User;
use App\Services\InvoiceService;
use App\Support\Tenancy\Tenancy;
use Illuminate\Routing\Middleware\ThrottleRequests;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

/* Invoices Phase 2 — payments (PRD §6.8): the OVERPAYMENT GUARD (6, 7), partial → paid (8), deleting
   a payment rolls the invoice back (9), and under any sequence of payments the balance is never
   negative and the paid amount never exceeds the total (10). The screenshot's $4,707.00 invoice that
   took a second $5,555.00 payment must be impossible. */

beforeEach(function () {
    Carbon::setTestNow('2026-10-12 12:00:00');
    $this->company = User::factory()->company()->create();
    // $4,707.00 — the screenshot's INV-…-0016: 4961.00 − 254.00, no tax.
    $this->invoice = Tenancy::instance()->runAs($this->company, function () {
        $client = Client::factory()->create();
        $project = Project::factory()->create(['client_id' => $client->id]);
        $item = ProjectItem::factory()->for($project)->create();

        return app(InvoiceService::class)->create([
            'client_id' => $client->id, 'project_id' => $project->id, 'invoice_date' => '2026-10-01', 'due_date' => '2026-10-31', 'discount_amount' => '254.00',
            'items' => [
                ['type' => 'item', 'project_item_id' => $item->id, 'quantity' => '5', 'price' => '113.00'],
                ['type' => 'item', 'project_item_id' => $item->id, 'quantity' => '12', 'price' => '108.00'],
                ['type' => 'item', 'project_item_id' => $item->id, 'quantity' => '20', 'price' => '155.00'],
            ],
        ]);
    });
    test()->actingAs($this->company->fresh(), 'web');
});

afterEach(fn () => Carbon::setTestNow());

function payInvoice(Invoice $invoice, string $amount, array $extra = [])
{
    return test()->postJson(route('v1.invoices.payments.store', $invoice), ['amount' => $amount, 'payment_type' => 'bank_transfer', ...$extra]);
}

function invoiceState(Invoice $invoice): array
{
    $row = DB::table('invoices')->find($invoice->id);

    // SQLite hands decimals back as numbers: compare as 2-place strings.
    return [$row->status, bcadd((string) $row->paid_amount, '0', 2), bcadd((string) $row->balance_due, '0', 2)];
}

test('6. a payment above the balance due → 422 naming the remaining balance; nothing is recorded', function () {
    expect($this->invoice->total)->toBe('4707.00');

    payInvoice($this->invoice, '4707.01')->assertUnprocessable()
        ->assertJsonValidationErrors(['amount' => 'The payment can\'t be more than the balance due of $4,707.00.']);
    payInvoice($this->invoice, '1000.00')->assertCreated();
    payInvoice($this->invoice, '5555.00')->assertUnprocessable()
        ->assertJsonValidationErrors(['amount' => 'The payment can\'t be more than the balance due of $3,707.00.']);

    expect(invoiceState($this->invoice))->toBe(['partial', '1000.00', '3707.00'])
        ->and(DB::table('invoice_payments')->count())->toBe(1);
});

test('7. a fully paid invoice accepts no further payment — the screenshot\'s $5,555.00 on a paid $4,707.00 invoice → 422', function () {
    payInvoice($this->invoice, '4707.00')->assertCreated();

    payInvoice($this->invoice, '5555.00')->assertUnprocessable()
        ->assertJsonValidationErrors(['amount' => 'This invoice is fully paid — it can\'t take another payment.']);
    payInvoice($this->invoice, '0.01')->assertUnprocessable()->assertJsonValidationErrors(['amount']);

    expect(invoiceState($this->invoice))->toBe(['paid', '4707.00', '0.00'])
        ->and(DB::table('invoice_payments')->count())->toBe(1);
});

test('8. a partial payment → Partial with the right balance; the exact remainder → Paid with a balance of exactly 0.00', function () {
    payInvoice($this->invoice, '1200.50', ['payment_type' => 'credit_card', 'description' => 'First instalment'])->assertCreated()
        ->assertJsonPath('data.amount', '1200.50')->assertJsonPath('data.payment_type', 'credit_card')->assertJsonPath('data.payment_type_label', 'Credit Card')
        ->assertJsonPath('data.status_label', 'Paid')->assertJsonPath('data.payment_date', '2026-10-12')->assertJsonPath('data.receipt_url', null)
        ->assertJsonPath('invoice.status', 'partial')->assertJsonPath('invoice.paid_amount', '1200.50')->assertJsonPath('invoice.balance_due', '3506.50');

    $response = payInvoice($this->invoice, '3506.50', ['payment_type' => null])->assertCreated()
        ->assertJsonPath('data.payment_type', 'bank_transfer') // the default
        ->assertJsonPath('invoice.status', 'paid')->assertJsonPath('invoice.paid_amount', '4707.00')->assertJsonPath('invoice.balance_due', '0.00')
        ->assertJsonPath('invoice.can_edit', false);
    expect($response->json('data.reference'))->toMatch('/^PAY\d{6}$/');

    $this->getJson(route('v1.invoices.payments.index', $this->invoice))->assertOk()->assertJsonCount(2, 'data')
        ->assertJsonPath('data.0.amount', '1200.50')->assertJsonPath('data.1.amount', '3506.50');
    payInvoice($this->invoice, '0', [])->assertUnprocessable()->assertJsonValidationErrors(['amount' => 'The payment amount must be greater than 0.']);
});

test('9. deleting a payment recalculates the paid amount, balance and status back down (Paid → Partial → Draft; a sent invoice → Sent)', function () {
    $first = payInvoice($this->invoice, '4000.00')->json('data.id');
    $second = payInvoice($this->invoice, '707.00')->json('data.id');
    expect(invoiceState($this->invoice))->toBe(['paid', '4707.00', '0.00']);

    $this->deleteJson(route('v1.invoice-payments.destroy', $second))->assertNoContent();
    expect(invoiceState($this->invoice))->toBe(['partial', '4000.00', '707.00']);
    $this->deleteJson(route('v1.invoice-payments.destroy', $first))->assertNoContent();
    expect(invoiceState($this->invoice))->toBe(['draft', '0.00', '4707.00']);

    Tenancy::instance()->runAs($this->company, fn () => app(InvoiceService::class)->markSent($this->invoice));
    $again = payInvoice($this->invoice, '10.00')->json('data.id');
    $this->deleteJson(route('v1.invoice-payments.destroy', $again))->assertNoContent();
    expect(invoiceState($this->invoice))->toBe(['sent', '0.00', '4707.00'])
        ->and(DB::table('invoice_payments')->count())->toBe(0);
});

test('10. under any sequence of payments and deletions: balance ≥ 0, paid ≤ total, balance = total − paid, references unique', function () {
    $this->withoutMiddleware(ThrottleRequests::class); // 60 payments in a row — past the route's 30/min limit
    mt_srand(20261012);
    $ids = [];
    for ($step = 0; $step < 60; $step++) {
        $balance = invoiceState($this->invoice)[2];
        if ($ids !== [] && mt_rand(0, 3) === 0) {
            $this->deleteJson(route('v1.invoice-payments.destroy', array_splice($ids, mt_rand(0, count($ids) - 1), 1)[0]))->assertNoContent();
        } else {
            // Sometimes within the balance, sometimes over it.
            $amount = number_format(mt_rand(1, 250000) / 100, 2, '.', '');
            $response = payInvoice($this->invoice, $amount);
            if (bccomp($amount, (string) $balance, 2) <= 0) {
                $response->assertCreated();
                $ids[] = $response->json('data.id');
            } else {
                $response->assertUnprocessable();
            }
        }

        [$status, $paid, $due] = invoiceState($this->invoice);
        $sum = DB::table('invoice_payments')->where('invoice_id', $this->invoice->id)->pluck('amount')->reduce(fn ($s, $a) => bcadd($s, (string) $a, 2), '0.00');
        expect(bccomp($due, '0', 2))->toBeGreaterThanOrEqual(0)
            ->and(bccomp($paid, '4707.00', 2))->toBeLessThanOrEqual(0)
            ->and($paid)->toBe($sum)
            ->and(bcadd($paid, $due, 2))->toBe('4707.00')
            ->and($status)->toBe(match (true) {
                $ids === [] => 'draft',
                bccomp($paid, '4707.00', 2) === 0 => 'paid',
                default => 'partial',
            });
    }
    expect(DB::table('invoice_payments')->distinct()->count('reference'))->toBe(DB::table('invoice_payments')->count());
});

test('payments are company-scoped: signed out → 401', function () {
    $id = payInvoice($this->invoice, '1.00')->json('data.id');
    test()->flushSession();
    Auth::forgetGuards();

    $this->deleteJson(route('v1.invoice-payments.destroy', $id))->assertUnauthorized();
    payInvoice($this->invoice, '1.00')->assertUnauthorized();
});
