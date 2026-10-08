<?php

namespace App\Http\Requests\Company;

use App\Models\Client;
use Illuminate\Validation\Rules\Unique;

/**
 * PUT /api/v1/clients/{client} — the Edit Client form: the same rules as Add, with the email
 * uniqueness ignoring the client being edited. The route-bound client is already limited to the
 * current company (BelongsToCompany); the policy checks ownership again.
 */
class UpdateClientRequest extends StoreClientRequest
{
    public function authorize(): bool
    {
        $client = $this->route('client');

        return $client instanceof Client && $this->user()->can('update', $client);
    }

    protected function uniqueEmail(): Unique
    {
        /** @var Client $client */
        $client = $this->route('client');

        return parent::uniqueEmail()->ignore($client->getKey());
    }
}
