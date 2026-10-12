<?php

namespace App\Services;

use App\Enums\PaymentStatus;
use App\Enums\PaymentType;
use App\Models\Invoice;
use App\Models\InvoicePayment;
use App\Support\Billing\PaymentReference;
use App\Support\Money;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Payments against a company invoice (PRD §6.8). The OVERPAYMENT GUARD lives here: inside one
 * transaction, with the invoice row locked, a payment must be > 0 and ≤ the current balance due —
 * a fully paid invoice (balance 0) accepts nothing more. So paid_amount never exceeds the total and
 * balance_due never goes negative, whatever the order of requests. Each payment gets the next
 * PAY{000000} reference and is recorded as Paid on the given date (today by default — the Add
 * Payment form has no date). After every add and delete, InvoiceService::settle() recomputes the
 * paid amount, the balance and the status (Partial / Paid, or back to Draft / Sent).
 */
class PaymentService
{
    public function __construct(private readonly InvoiceService $invoices) {}

    /**
     * @param  array<string, mixed>  $data  amount, payment_type, description
     */
    public function add(Invoice $invoice, array $data, ?Carbon $paidOn = null): InvoicePayment
    {
        return DB::transaction(function () use ($invoice, $data, $paidOn): InvoicePayment {
            /** @var Invoice $locked */
            $locked = Invoice::query()->lockForUpdate()->findOrFail($invoice->getKey());
            $balance = bcadd((string) $locked->balance_due, '0', 2);

            if (! is_numeric($data['amount'] ?? null)) {
                $this->fail(__('Enter the payment amount.'));
            }
            $amount = bcadd((string) $data['amount'], '0', 2);
            if (bccomp($balance, '0', 2) <= 0) {
                $this->fail(__('This invoice is fully paid — it can\'t take another payment.'));
            }
            if (bccomp($amount, '0', 2) <= 0) {
                $this->fail(__('The payment amount must be greater than 0.'));
            }
            if (bccomp($amount, $balance, 2) > 0) {
                $this->fail(__('The payment can\'t be more than the balance due of :balance.', ['balance' => Money::format($balance)]));
            }

            $description = trim((string) ($data['description'] ?? ''));
            $payment = $locked->payments()->make();
            $payment->forceFill([
                'payment_date' => ($paidOn ?? Carbon::today())->toDateString(),
                'amount' => $amount,
                'payment_type' => PaymentType::from((string) ($data['payment_type'] ?? PaymentType::BankTransfer->value)),
                'reference' => PaymentReference::next(),
                'status' => PaymentStatus::Paid,
                'description' => $description !== '' ? $description : null,
            ])->save();

            $this->invoices->settle($locked);

            return $payment;
        });
    }

    /** Removes the payment; the invoice's paid amount, balance and status roll back. */
    public function delete(InvoicePayment $payment): Invoice
    {
        return DB::transaction(function () use ($payment): Invoice {
            /** @var Invoice $locked */
            $locked = Invoice::query()->lockForUpdate()->findOrFail($payment->invoice_id);
            $payment->delete();

            return $this->invoices->settle($locked);
        });
    }

    private function fail(string $message): never
    {
        throw ValidationException::withMessages(['amount' => $message]);
    }
}
