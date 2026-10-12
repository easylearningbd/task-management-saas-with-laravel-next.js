<?php

namespace App\Services;

use App\Models\Invoice;
use App\Support\Tenancy\Tenancy;
use Illuminate\Support\Facades\DB;

/**
 * The public share page's lookup (/i/{token}, PAGE SPEC D) — the token is the only key. A guest has
 * no company context (every tenant query matches nothing), and a signed-in company must not see
 * another company's invoice through its own context either; so the invoice's company is read from
 * the table by token alone (a live, non-deleted invoice), and the invoice is then loaded INSIDE that
 * company's context with the normal tenant scope — no CrossTenant, no withoutGlobalScopes().
 * An unknown, malformed or deleted token → null (the controller answers 404).
 */
class PublicInvoiceService
{
    /** The share token's shape — anything else is never looked up. */
    public const TOKEN_PATTERN = '/^[A-Za-z0-9]{20,64}$/';

    public function find(string $token): ?Invoice
    {
        if (preg_match(self::TOKEN_PATTERN, $token) !== 1) {
            return null;
        }

        $companyId = DB::table('invoices')->where('public_token', $token)->whereNull('deleted_at')->value('company_id');
        if ($companyId === null) {
            return null;
        }

        return Tenancy::instance()->runAs((int) $companyId, fn (): ?Invoice => Invoice::query()
            ->with(['client', 'project', 'items', 'taxes'])
            ->where('public_token', $token)
            ->first());
    }
}
