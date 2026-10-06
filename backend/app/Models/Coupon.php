<?php

namespace App\Models;

use App\Enums\CouponType;
use Database\Factories\CouponFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

/**
 * A discount code the super admin creates. Global (not tenant-owned).
 * Redemption and usage tracking come later; this model only describes the coupon.
 */
#[Fillable([
    'name',
    'code',
    'type',
    'value',
    'min_spend',
    'max_spend',
    'usage_limit',
    'per_user_limit',
    'expiry_date',
    'is_active',
])]
class Coupon extends Model
{
    /** @use HasFactory<CouponFactory> */
    use HasFactory, SoftDeletes;

    /**
     * Mirror the column defaults so a freshly created model reports them.
     *
     * @var array<string, mixed>
     */
    protected $attributes = [
        'is_active' => true,
    ];

    /**
     * Money stays decimal strings (`decimal:2`) — never floats.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => CouponType::class,
            'value' => 'decimal:2',
            'min_spend' => 'decimal:2',
            'max_spend' => 'decimal:2',
            'usage_limit' => 'integer',
            'per_user_limit' => 'integer',
            'expiry_date' => 'date',
            'is_active' => 'boolean',
        ];
    }

    /** Codes are always stored trimmed and uppercase ("  summer20 " → "SUMMER20"). */
    protected function code(): Attribute
    {
        return Attribute::set(fn (?string $value): ?string => self::normalizeCode($value));
    }

    public static function normalizeCode(?string $value): ?string
    {
        return $value === null ? null : mb_strtoupper(trim($value));
    }

    /**
     * @param  Builder<Coupon>  $query
     */
    public function scopeActive(Builder $query, bool $active = true): void
    {
        $query->where('is_active', $active);
    }

    /**
     * @param  Builder<Coupon>  $query
     */
    public function scopeOfType(Builder $query, CouponType|string $type): void
    {
        $query->where('type', $type instanceof CouponType ? $type->value : $type);
    }

    /**
     * Case-insensitive "contains" match on name or code. LIKE wildcards in the term are
     * escaped with an explicit ESCAPE character (MySQL and SQLite disagree on the default),
     * so "%" or "_" match literally. The term is always a bound parameter.
     *
     * @param  Builder<Coupon>  $query
     */
    public function scopeSearch(Builder $query, ?string $term): void
    {
        $term = trim((string) $term);
        if ($term === '') {
            return;
        }

        $like = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $term).'%';
        $query->where(fn (Builder $q) => $q
            ->whereRaw("name like ? escape '!'", [$like])
            ->orWhereRaw("code like ? escape '!'", [$like]));
    }
}
