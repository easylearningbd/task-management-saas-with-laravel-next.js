<?php

namespace App\Models;

use App\Enums\ExpenseCategoryStatus;
use App\Models\Concerns\BelongsToCompany;
use Database\Factories\ExpenseCategoryFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Str;

/**
 * A company's expense category (PRD §6.14). BelongsToCompany limits every query (route binding
 * included) to the current company and stamps `company_id` on create; `company_id` is
 * deliberately not fillable. The colour is always stored uppercase ("#10b77f" → "#10B77F").
 *
 * @property int $id
 * @property int $company_id
 * @property string $name
 * @property string|null $description
 * @property string $color
 * @property ExpenseCategoryStatus $status
 */
class ExpenseCategory extends Model
{
    /** @use HasFactory<ExpenseCategoryFactory> */
    use BelongsToCompany, HasFactory, SoftDeletes;

    protected $fillable = ['name', 'description', 'color', 'status'];

    protected $attributes = [
        'status' => 'active',
    ];

    protected function casts(): array
    {
        return [
            'status' => ExpenseCategoryStatus::class,
        ];
    }

    /** `#RRGGBB`, uppercase on the way in, whatever case it was given in. */
    protected function color(): Attribute
    {
        return Attribute::set(fn (?string $value): ?string => $value === null ? null : Str::upper(trim($value)));
    }

    /** Name or description contains the term (LIKE-escaped). */
    public function scopeSearch(Builder $query, ?string $term): void
    {
        $term = trim((string) $term);
        if ($term === '') {
            return;
        }

        $like = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $term).'%';
        $query->where(fn (Builder $q) => $q
            ->whereRaw("expense_categories.name like ? escape '!'", [$like])
            ->orWhereRaw("expense_categories.description like ? escape '!'", [$like]));
    }

    public function scopeOfStatus(Builder $query, ExpenseCategoryStatus|string|null $status): void
    {
        if ($status === null || $status === '') {
            return;
        }

        $query->where('expense_categories.status', $status instanceof ExpenseCategoryStatus ? $status->value : $status);
    }

    /**
     * Exactly this name, ignoring case ("travel" = "Travel"). Explicit LOWER() so the answer
     * is the same on MySQL (case-insensitive collation) and SQLite (case-sensitive), the test
     * database.
     */
    public function scopeNamed(Builder $query, string $name): void
    {
        $query->whereRaw('LOWER(expense_categories.name) = ?', [Str::lower(trim($name))]);
    }

    /** The expenses filed under this category (a category in use can't be deleted). */
    public function expenses(): HasMany
    {
        return $this->hasMany(Expense::class);
    }
}
