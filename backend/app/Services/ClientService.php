<?php

namespace App\Services;

use App\Models\Client;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Validation\ValidationException;

/**
 * Client business logic (PRD §6.7). Every method works on the current company's clients only:
 * the model's BelongsToCompany scope and creating hook do the tenancy — nothing here takes or
 * sets a `company_id`.
 */
class ClientService
{
    /**
     * The list query: search (name, email, company, phone) and the status filter.
     *
     * @param  array{search?: ?string, status?: ?string, created_from?: ?string, created_to?: ?string}  $filters
     * @return Builder<Client>
     */
    public function query(array $filters): Builder
    {
        return Client::query()
            ->search($filters['search'] ?? null)
            ->ofStatus($filters['status'] ?? null)
            ->when($filters['created_from'] ?? null, fn (Builder $q, string $from) => $q->whereDate('clients.created_at', '>=', $from))
            ->when($filters['created_to'] ?? null, fn (Builder $q, string $to) => $q->whereDate('clients.created_at', '<=', $to));
    }

    /**
     * @param  array<string, mixed>  $data  validated name, email, phone, company_name, address, website, status, notes
     */
    public function create(array $data): Client
    {
        return Client::create($data);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Client $client, array $data): Client
    {
        $client->update($data);

        return $client;
    }

    /** Active ↔ Inactive. */
    public function toggleStatus(Client $client): Client
    {
        $client->status = $client->status->toggled();
        $client->save();

        return $client;
    }

    /** Soft delete. */
    public function delete(Client $client): void
    {
        $this->ensureDeletable($client);

        $client->delete();
    }

    /**
     * PRD §6.7: "a client with projects or invoices cannot be deleted". Projects: any live
     * project of this client blocks it. TODO(invoices): add the invoices check when that module
     * exists.
     */
    private function ensureDeletable(Client $client): void
    {
        if ($client->projects()->exists()) {
            throw ValidationException::withMessages([
                'client' => __('This client has projects. Delete or move them to another client first.'),
            ]);
        }
    }
}
