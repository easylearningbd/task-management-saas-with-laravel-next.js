<?php

namespace App\Models;

use App\Models\Concerns\BelongsToCompany;
use Database\Factories\TaxFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * One of the company's tax rates (the invoice form's Tax multi-select). `rate` is a percent
 * ("10.00"). Invoices keep their own snapshot of name and rate (InvoiceTax).
 *
 * @property int $id
 * @property int $company_id
 * @property string $name
 * @property string $rate
 * @property bool $is_active
 */
class Tax extends Model
{
    /** @use HasFactory<TaxFactory> */
    use BelongsToCompany, HasFactory, SoftDeletes;

    protected $fillable = ['name', 'rate', 'is_active'];

    protected $attributes = [
        'is_active' => true,
    ];

    protected function casts(): array
    {
        return [
            'rate' => 'decimal:2',
            'is_active' => 'boolean',
        ];
    }

    /**
     * @param  Builder<Tax>  $query
     */
    public function scopeActive(Builder $query): void
    {
        $query->where('taxes.is_active', true);
    }

    /**
     * @param  Builder<Tax>  $query
     */
    public function scopeNamed(Builder $query, string $name): void
    {
        $query->where('taxes.name', $name);
    }
}
