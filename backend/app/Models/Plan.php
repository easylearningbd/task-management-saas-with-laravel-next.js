<?php

namespace App\Models;

use Database\Factories\PlanFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A subscription tier companies can buy. Global (not tenant-owned).
 *
 * `is_default` and `sort_order` are deliberately not fillable: they are only ever set by
 * PlanService, which keeps exactly one default plan and appends new plans at the end.
 */
#[Fillable([
    'name',
    'description',
    'monthly_price',
    'yearly_price',
    'max_projects',
    'storage_limit_gb',
    'trial_enabled',
    'trial_days',
    'ai_integration',
    'is_active',
    'is_recommended',
])]
class Plan extends Model
{
    /** @use HasFactory<PlanFactory> */
    use HasFactory, SoftDeletes;

    /** `max_projects` value meaning "no limit". */
    public const UNLIMITED = -1;

    /**
     * Mirror the column defaults so a freshly created model reports them.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'monthly_price' => '0.00',
        'yearly_price' => '0.00',
        'max_projects' => 0,
        'storage_limit_gb' => '0.00',
        'trial_enabled' => false,
        'trial_days' => 0,
        'ai_integration' => false,
        'is_active' => true,
        'is_default' => false,
        'is_recommended' => false,
        'sort_order' => 0,
    ];

    /**
     * Money and storage stay decimal strings (`decimal:2`) — never floats.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'monthly_price' => 'decimal:2',
            'yearly_price' => 'decimal:2',
            'storage_limit_gb' => 'decimal:2',
            'max_projects' => 'integer',
            'trial_days' => 'integer',
            'sort_order' => 'integer',
            'trial_enabled' => 'boolean',
            'ai_integration' => 'boolean',
            'is_active' => 'boolean',
            'is_default' => 'boolean',
            'is_recommended' => 'boolean',
        ];
    }

    /** Companies currently on this plan. */
    public function subscribers(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /** `$plan->is_unlimited` — true when the project limit is -1. */
    protected function isUnlimited(): Attribute
    {
        return Attribute::get(fn (): bool => $this->max_projects === self::UNLIMITED);
    }

    /**
     * @param  Builder<Plan>  $query
     */
    public function scopeActive(Builder $query): void
    {
        $query->where('is_active', true);
    }

    /**
     * List order: `sort_order`, then id.
     *
     * @param  Builder<Plan>  $query
     */
    public function scopeOrdered(Builder $query): void
    {
        $query->orderBy('sort_order')->orderBy('id');
    }
}
