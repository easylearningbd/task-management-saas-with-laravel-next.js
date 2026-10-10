<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Database\Factories\ExpenseFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * An expense on a project (PRD §6.9, the Expenses tab), filed under one of the company's
 * expense categories. `expense_category_id` is validated against the company's own active
 * categories by the requests; `project_id` comes from the route-bound project.
 *
 * @property int $id
 * @property int $company_id
 * @property int $project_id
 * @property int $expense_category_id
 * @property string $title
 * @property string|null $description
 * @property string $amount
 * @property Carbon $expense_date
 */
class Expense extends Model
{
    /** @use HasFactory<ExpenseFactory> */
    use BelongsToCompany, HasFactory, SoftDeletes;

    protected $fillable = ['expense_category_id', 'title', 'description', 'amount', 'expense_date'];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'expense_date' => 'date',
        ];
    }

    public function project(): BelongsTo
    {
        return $this->belongsTo(Project::class);
    }

    /** The category (shown with its own colour); kept visible even if it was deleted later. */
    public function category(): BelongsTo
    {
        return $this->belongsTo(ExpenseCategory::class, 'expense_category_id')->withTrashed();
    }
}
