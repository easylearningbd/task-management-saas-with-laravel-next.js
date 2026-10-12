<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Http\Controllers\Controller;
use App\Http\Requests\Company\IndexInvoiceRequest;
use App\Http\Requests\Company\StoreInvoiceRequest;
use App\Http\Requests\Company\UpdateInvoiceRequest;
use App\Http\Resources\InvoiceListResource;
use App\Http\Resources\InvoiceResource;
use App\Models\Invoice;
use App\Services\InvoiceService;
use App\Support\ListQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * /api/v1/invoices — the signed-in company's invoices (PRD §6.8). Tenancy is not handled here:
 * every query and route binding goes through BelongsToCompany, so another company's invoice id
 * answers 404; the policy re-checks ownership. InvoiceService computes every amount and refuses
 * edits / deletes of Partial and Paid invoices (422).
 */
class InvoiceController extends Controller
{
    public function __construct(private readonly InvoiceService $invoices) {}

    /** Paginated, searchable, filterable, sortable — with the client and project (no N+1). */
    public function index(IndexInvoiceRequest $request): AnonymousResourceCollection
    {
        return InvoiceListResource::collection(ListQuery::paginate($this->invoices->query($request->filters()), $request));
    }

    public function store(StoreInvoiceRequest $request): JsonResponse
    {
        return (new InvoiceResource($this->invoices->create($request->invoiceData())))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Invoice $invoice): InvoiceResource
    {
        Gate::authorize('view', $invoice);

        return new InvoiceResource($invoice->load(['client', 'project', 'items', 'taxes', 'payments']));
    }

    public function update(UpdateInvoiceRequest $request, Invoice $invoice): InvoiceResource
    {
        return new InvoiceResource($this->invoices->update($invoice, $request->invoiceData()));
    }

    /** Soft delete — Draft and Sent only. */
    public function destroy(Invoice $invoice): Response
    {
        Gate::authorize('delete', $invoice);

        $this->invoices->delete($invoice);

        return response()->noContent();
    }
}
