<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Http\Controllers\Controller;
use App\Http\Requests\Company\IndexClientRequest;
use App\Http\Requests\Company\StoreClientRequest;
use App\Http\Requests\Company\UpdateClientRequest;
use App\Http\Resources\ClientResource;
use App\Models\Client;
use App\Services\ClientService;
use App\Support\ListQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * /api/v1/clients — the signed-in company's clients (PRD §6.7). Tenancy is not handled here:
 * every query and route binding goes through BelongsToCompany, so another company's client id
 * resolves to nothing and answers 404. The policy re-checks ownership.
 */
class ClientController extends Controller
{
    public function __construct(private readonly ClientService $clients) {}

    /** Paginated, searchable, filterable, sortable list. */
    public function index(IndexClientRequest $request): AnonymousResourceCollection
    {
        return ClientResource::collection(ListQuery::paginate($this->clients->query($request->filters()), $request));
    }

    public function store(StoreClientRequest $request): JsonResponse
    {
        return (new ClientResource($this->clients->create($request->clientData())))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Client $client): ClientResource
    {
        Gate::authorize('view', $client);

        return new ClientResource($client);
    }

    public function update(UpdateClientRequest $request, Client $client): ClientResource
    {
        return new ClientResource($this->clients->update($client, $request->clientData()));
    }

    /** Soft delete. */
    public function destroy(Client $client): Response
    {
        Gate::authorize('delete', $client);

        $this->clients->delete($client);

        return response()->noContent();
    }

    /** PATCH …/{client}/toggle-status — Active ↔ Inactive. */
    public function toggleStatus(Client $client): ClientResource
    {
        Gate::authorize('update', $client);

        return new ClientResource($this->clients->toggleStatus($client));
    }
}
