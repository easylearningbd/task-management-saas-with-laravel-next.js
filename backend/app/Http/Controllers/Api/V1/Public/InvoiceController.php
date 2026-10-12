<?php

namespace App\Http\Controllers\Api\V1\Public;

use App\Http\Controllers\Controller;
use App\Http\Resources\PublicInvoiceResource;
use App\Services\InvoiceSettingsService;
use App\Services\PublicInvoiceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

/**
 * GET /api/v1/public/invoices/{token} — the public share page (/i/{token}). No authentication: the
 * unguessable token is the only key, and the answer exposes only what the document shows (no ids,
 * no other invoice, only the company's "Billed From" block). An unknown, malformed or deleted
 * token → 404. Rate-limited by the route.
 */
class InvoiceController extends Controller
{
    public function __construct(
        private readonly PublicInvoiceService $invoices,
        private readonly InvoiceSettingsService $settings,
    ) {}

    public function __invoke(string $token): PublicInvoiceResource|JsonResponse
    {
        $invoice = $this->invoices->find($token);
        if ($invoice === null) {
            // Answered directly (not thrown), so even a debug environment returns only the message.
            return response()->json(['message' => __('Invoice not found.')], Response::HTTP_NOT_FOUND);
        }

        return new PublicInvoiceResource($invoice, $this->settings->get($invoice->company_id));
    }
}
