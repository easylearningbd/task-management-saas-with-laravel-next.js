<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Http\Controllers\Controller;
use App\Http\Requests\Company\IndexExpenseCategoryRequest;
use App\Http\Requests\Company\StoreExpenseCategoryRequest;
use App\Http\Requests\Company\UpdateExpenseCategoryRequest;
use App\Http\Resources\ExpenseCategoryResource;
use App\Models\ExpenseCategory;
use App\Services\ExpenseCategoryService;
use App\Support\ListQuery;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * /api/v1/expense-categories — the signed-in company's expense categories (PRD §6.14). Tenancy
 * is not handled here: every query and route binding goes through BelongsToCompany, so another
 * company's category id resolves to nothing and answers 404. The policy re-checks ownership.
 */
class ExpenseCategoryController extends Controller
{
    public function __construct(private readonly ExpenseCategoryService $categories) {}

    /** Paginated, searchable, filterable, sortable list. */
    public function index(IndexExpenseCategoryRequest $request): AnonymousResourceCollection
    {
        return ExpenseCategoryResource::collection(ListQuery::paginate($this->categories->query($request->filters()), $request));
    }

    /** 201 — a new category, or a deleted one of the same name restored with these values. */
    public function store(StoreExpenseCategoryRequest $request): JsonResponse
    {
        return (new ExpenseCategoryResource($this->categories->create($request->categoryData())))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(ExpenseCategory $category): ExpenseCategoryResource
    {
        Gate::authorize('view', $category);

        return new ExpenseCategoryResource($category);
    }

    public function update(UpdateExpenseCategoryRequest $request, ExpenseCategory $category): ExpenseCategoryResource
    {
        return new ExpenseCategoryResource($this->categories->update($category, $request->categoryData()));
    }

    /** Soft delete. */
    public function destroy(ExpenseCategory $category): Response
    {
        Gate::authorize('delete', $category);

        $this->categories->delete($category);

        return response()->noContent();
    }

    /** PATCH …/{category}/toggle-status — Active ↔ Inactive. */
    public function toggleStatus(ExpenseCategory $category): ExpenseCategoryResource
    {
        Gate::authorize('update', $category);

        return new ExpenseCategoryResource($this->categories->toggleStatus($category));
    }
}
