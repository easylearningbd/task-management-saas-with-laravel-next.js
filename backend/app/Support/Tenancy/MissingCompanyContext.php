<?php

namespace App\Support\Tenancy;

use LogicException;

/**
 * A tenant-owned record was about to be written (or a cross-tenant read attempted) in the
 * wrong context. Always a programming error, never user input — so it is a LogicException
 * (500 + logged), not a validation response.
 */
final class MissingCompanyContext extends LogicException
{
    public static function forWrite(): self
    {
        return new self(
            'No company context: a tenant-owned record can only be created for a company. '
            .'Run as a signed-in company, or wrap the code in Tenancy::instance()->runAs($company, fn () => …).'
        );
    }

    public static function notACompany(int $id): self
    {
        return new self("User #{$id} is not a company account; tenant data can only be owned by a company.");
    }

    public static function companyIdChanged(): self
    {
        return new self('company_id is set once, on create, and can never be changed.');
    }

    public static function crossTenantInsideCompany(): self
    {
        return new self(
            'CrossTenant queries are for Super Admin / system code only and cannot run inside a company context.'
        );
    }
}
