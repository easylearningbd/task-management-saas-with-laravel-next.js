<?php

namespace App\Http\Controllers\Api\V1\Company;

use App\Http\Controllers\Controller;
use App\Http\Requests\Company\StoreExpenseRequest;
use App\Http\Requests\Company\UpdateExpenseRequest;
use App\Http\Resources\ExpenseResource;
use App\Models\Expense;
use App\Models\Project;
use App\Services\ExpenseService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Gate;

/**
 * The Expenses tab: listed, created and summed (stats) under `projects/{project}`; edited and
 * deleted as `expenses/{expense}`. Every binding is tenant-scoped (another company's id → 404).
 */
class ExpenseController extends Controller
{
    public function __construct(private readonly ExpenseService $expenses) {}

    public function index(Project $project): AnonymousResourceCollection
    {
        Gate::authorize('view', $project);

        return ExpenseResource::collection($this->expenses->forProject($project));
    }

    /** GET …/expenses/stats — the two stat cards: how many, and the exact total. */
    public function stats(Project $project): JsonResponse
    {
        Gate::authorize('view', $project);

        return response()->json(['data' => $this->expenses->stats($project)]);
    }

    public function store(StoreExpenseRequest $request, Project $project): JsonResponse
    {
        return (new ExpenseResource($this->expenses->create($project, $request->expenseData())))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateExpenseRequest $request, Expense $expense): ExpenseResource
    {
        return new ExpenseResource($this->expenses->update($expense, $request->expenseData()));
    }

    public function destroy(Expense $expense): Response
    {
        Gate::authorize('delete', $expense);
        $this->expenses->delete($expense);

        return response()->noContent();
    }
}
