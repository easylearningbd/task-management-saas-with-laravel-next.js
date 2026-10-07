<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\ChangeCompanyPlanRequest;
use App\Http\Requests\Admin\IndexActivityRequest;
use App\Http\Requests\Admin\IndexCompanyRequest;
use App\Http\Requests\Admin\ResetCompanyPasswordRequest;
use App\Http\Requests\Admin\StoreCompanyRequest;
use App\Http\Requests\Admin\UpdateCompanyRequest;
use App\Http\Resources\CompanyActivityResource;
use App\Http\Resources\CompanyDetailResource;
use App\Http\Resources\CompanyResource;
use App\Models\Company;
use App\Services\CompanyService;
use App\Support\ListQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * /api/v1/admin/companies — Super Admin company management. Thin: Form Requests validate and
 * authorize, CompanyService holds every rule (and writes the activity log), resources shape
 * output. `{company}` binds through the Company model, so a super admin's id is a 404.
 */
class CompanyController extends Controller
{
    public function __construct(private readonly CompanyService $companies) {}

    /** Paginated, searchable, filterable, sortable list (plan eager-loaded). */
    public function index(IndexCompanyRequest $request): AnonymousResourceCollection
    {
        return CompanyResource::collection(
            ListQuery::paginate($this->companies->query($request->filters()), $request),
        );
    }

    public function store(StoreCompanyRequest $request): JsonResponse
    {
        $company = $this->companies->create($request->companyData(), $request->user());

        return (new CompanyResource($company->load('plan')))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    /** The details page payload: plan, limits, usage, latest activity. */
    public function show(Company $company): CompanyDetailResource
    {
        Gate::authorize('view', $company);

        return new CompanyDetailResource($company->load('plan'));
    }

    public function update(UpdateCompanyRequest $request, Company $company): CompanyResource
    {
        return new CompanyResource($this->companies->update($company, $request->companyData(), $request->user())->load('plan'));
    }

    public function destroy(Request $request, Company $company): Response
    {
        Gate::authorize('delete', $company);

        $this->companies->delete($company, $request->user());

        return response()->noContent();
    }

    /** PATCH …/{company}/toggle-login — flips `is_login_enabled` only (never `status`). */
    public function toggleLogin(Request $request, Company $company): CompanyResource
    {
        Gate::authorize('update', $company);

        return new CompanyResource($this->companies->toggleLogin($company, $request->user())->load('plan'));
    }

    /** PATCH …/{company}/reset-password */
    public function resetPassword(ResetCompanyPasswordRequest $request, Company $company): CompanyResource
    {
        return new CompanyResource(
            $this->companies->resetPassword($company, $request->validated('password'), $request->user())->load('plan'),
        );
    }

    /** PATCH …/{company}/change-plan — manual assignment, no payment. */
    public function changePlan(ChangeCompanyPlanRequest $request, Company $company): CompanyResource
    {
        return new CompanyResource(
            $this->companies->changePlan($company, $request->plan(), $request->duration(), $request->user()),
        );
    }

    /** GET …/{company}/activities — this company's log, newest first. */
    public function activities(IndexActivityRequest $request, Company $company): AnonymousResourceCollection
    {
        return CompanyActivityResource::collection(
            ListQuery::paginate($this->companies->activityQuery($company, $request->validated('action')), $request),
        );
    }
}
