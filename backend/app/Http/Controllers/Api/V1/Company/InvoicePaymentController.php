<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Http\Controllers\Controller;
use App\Http\Requests\Company\StoreInvoicePaymentRequest;
use App\Http\Resources\InvoicePaymentResource;
use App\Http\Resources\InvoiceResource;
use App\Models\Invoice;
use App\Models\InvoicePayment;
use App\Services\PaymentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * An invoice's payments — listed and added under the invoice, deleted by their own id. Both are
 * tenant-scoped (another company's id → 404). PaymentService refuses any payment above the balance
 * due (or on a fully paid invoice) and recalculates the invoice after every add and delete; a new
 * payment's response carries the recalculated invoice as `invoice`.
 */
class InvoicePaymentController extends Controller
{
    public function __construct(private readonly PaymentService $payments) {}

    /** Oldest first — an invoice has a handful of payments, so the list isn't paginated. */
    public function index(Invoice $invoice): AnonymousResourceCollection
    {
        Gate::authorize('view', $invoice);

        return InvoicePaymentResource::collection($invoice->payments()->get());
    }

    public function store(StoreInvoicePaymentRequest $request, Invoice $invoice): JsonResponse
    {
        $payment = $this->payments->add($invoice, $request->paymentData());

        return (new InvoicePaymentResource($payment))
            ->additional(['invoice' => new InvoiceResource($invoice->refresh()->load(['client', 'project', 'items', 'taxes', 'payments']))])
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function destroy(InvoicePayment $payment): Response
    {
        Gate::authorize('delete', $payment);

        $this->payments->delete($payment);

        return response()->noContent();
    }
}
