<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Http\Controllers\Controller;
use App\Http\Requests\Company\UpdateInvoiceSettingsRequest;
use App\Services\InvoiceSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * GET / PUT /api/v1/settings/invoice-details — the signed-in company's invoice "Billed From"
 * block (company name, email, phone, address, city, state, zip, country). Always the signed-in
 * company's own rows: the id comes from the session, never from input.
 */
class InvoiceSettingsController extends Controller
{
    public function __construct(private readonly InvoiceSettingsService $settings) {}

    public function show(Request $request): JsonResponse
    {
        return response()->json(['data' => $this->settings->get((int) $request->user()->getKey())]);
    }

    public function update(UpdateInvoiceSettingsRequest $request): JsonResponse
    {
        return response()->json(['data' => $this->settings->update((int) $request->user()->getKey(), $request->settings())]);
    }
}
