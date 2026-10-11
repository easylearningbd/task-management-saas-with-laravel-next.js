<?php

namespace App\Models;

use App\Enums\PaymentMethod;
use App\Enums\PlanDuration;
use App\Enums\PlanOrderStatus;
use App\Enums\PlanOrderType;
use App\Models\Concerns\BelongsToCompany;
use Database\Factories\PlanOrderFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Carbon;

/**
 * A company's plan request, purchase or trial (the single `plan_orders` model — see the
 * migration). Tenant-owned: BelongsToCompany scopes every read to the current company and stamps
 * `company_id` on create. Every column is written by the billing services from what the server
 * decided (the price snapshot, the code, the status) — nothing is mass-assignable.
 *
 * @property int $id
 * @property string $order_code
 * @property int $company_id
 * @property int $plan_id
 * @property PlanOrderType $type
 * @property PlanDuration $duration
 * @property string $price
 * @property int|null $coupon_id
 * @property string $discount
 * @property string $final_amount
 * @property PaymentMethod|null $payment_method
 * @property string|null $payment_reference
 * @property string|null $receipt_path
 * @property string|null $receipt_name
 * @property string|null $notes
 * @property PlanOrderStatus $status
 * @property int|null $reviewed_by
 * @property Carbon|null $reviewed_at
 * @property string|null $rejection_reason
 */
class PlanOrder extends Model
{
    /** @use HasFactory<PlanOrderFactory> */
    use BelongsToCompany, HasFactory, SoftDeletes;

    protected $fillable = [];

    /**
     * Money stays a decimal string (`decimal:2`) — never a float.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'type' => PlanOrderType::class,
            'duration' => PlanDuration::class,
            'status' => PlanOrderStatus::class,
            'payment_method' => PaymentMethod::class,
            'price' => 'decimal:2',
            'discount' => 'decimal:2',
            'final_amount' => 'decimal:2',
            'reviewed_at' => 'datetime',
        ];
    }

    /** The plan ordered — kept even if the plan is deleted later (history). */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class)->withTrashed();
    }

    /** The super admin who approved or rejected it. */
    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewed_by')->withTrashed();
    }

    /** Reserved for coupons at checkout (not applied yet). */
    public function coupon(): BelongsTo
    {
        return $this->belongsTo(Coupon::class)->withTrashed();
    }

    /**
     * @param  Builder<PlanOrder>  $query
     */
    public function scopePending(Builder $query): void
    {
        $query->where('plan_orders.status', PlanOrderStatus::Pending->value);
    }

    /**
     * The list filters shared by the company and admin lists: search (order code, payment
     * reference, plan name — and the company's name / email when `$withCompany`, admin side),
     * status, type and plan (`plan_id`, admin side). The search term is LIKE-escaped.
     *
     * @param  Builder<PlanOrder>  $query
     * @param  array{search?: ?string, status?: ?string, type?: ?string, plan_id?: ?int}  $filters
     */
    public function scopeFilter(Builder $query, array $filters, bool $withCompany = false): void
    {
        $search = trim((string) ($filters['search'] ?? ''));
        if ($search !== '') {
            $like = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $search).'%';
            $query->where(function (Builder $q) use ($like, $withCompany): void {
                $q->whereRaw("plan_orders.order_code like ? escape '!'", [$like])
                    ->orWhereRaw("plan_orders.payment_reference like ? escape '!'", [$like])
                    ->orWhereHas('plan', fn (Builder $p) => $p->whereRaw("plans.name like ? escape '!'", [$like]));
                if ($withCompany) {
                    $q->orWhereHas('company', fn (Builder $c) => $c->where(fn (Builder $w) => $w
                        ->whereRaw("users.name like ? escape '!'", [$like])
                        ->orWhereRaw("users.email like ? escape '!'", [$like])));
                }
            });
        }

        $query
            ->when($filters['status'] ?? null, fn (Builder $q, string $status) => $q->where('plan_orders.status', $status))
            ->when($filters['type'] ?? null, fn (Builder $q, string $type) => $q->where('plan_orders.type', $type))
            ->when($filters['plan_id'] ?? null, fn (Builder $q, int $planId) => $q->where('plan_orders.plan_id', $planId));
    }

    public function isPending(): bool
    {
        return $this->status === PlanOrderStatus::Pending;
    }
}
