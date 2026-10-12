<?php

namespace App\Http\Requests\Company;

/**
 * PUT /api/v1/invoices/{invoice} — the Edit Invoice form: the same fields and rules as create;
 * the service refuses an invoice that is no longer Draft / Sent (422).
 */
class UpdateInvoiceRequest extends StoreInvoiceRequest
{
    public function authorize(): bool
    {
        return $this->user()->can('update', $this->route('invoice'));
    }
}
