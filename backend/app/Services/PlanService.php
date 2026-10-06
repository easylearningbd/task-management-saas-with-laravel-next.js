<?php

namespace App\Services;

use App\Models\Plan;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Every subscription-plan business rule (CLAUDE.md §8, PRD §8.3):
 *  1. An empty yearly price becomes monthly × 12 × 0.8, rounded half-up to 2 decimals.
 *  2. max_projects = -1 means unlimited (validated in the Form Requests).
 *  3. Exactly one default plan — switching happens inside one transaction.
 *  4. The default plan is always active; it cannot be deactivated or deleted.
 *  5. A plan with subscribers cannot be deleted — deactivate it instead.
 *  6. trial_days is 0 when trials are off and at least 1 when they are on.
 * Money is handled as decimal strings with bcmath — never floats.
 */
class PlanService
{
    /** Yearly price = monthly × 12 × this, when no yearly price is given. */
    public const YEARLY_FACTOR = '0.8';

    /**
     * @param  array<string, mixed>  $data  validated input
     */
    public function create(array $data): Plan
    {
        return DB::transaction(function () use ($data): Plan {
            $plan = new Plan;
            $this->apply($plan, $data);

            // New plans go to the end of the list (sort_order is not on the form).
            $plan->sort_order = (int) Plan::withTrashed()->max('sort_order') + 1;

            $makeDefault = (bool) ($data['is_default'] ?? false);
            if ($makeDefault) {
                $plan->is_active = true;
            }
            $plan->save();

            if ($makeDefault) {
                $this->makeDefault($plan);
            }

            return $plan->refresh();
        });
    }

    /**
     * @param  array<string, mixed>  $data  validated input
     */
    public function update(Plan $plan, array $data): Plan
    {
        return DB::transaction(function () use ($plan, $data): Plan {
            $wasDefault = $plan->is_default;
            $wantsDefault = array_key_exists('is_default', $data) ? (bool) $data['is_default'] : $wasDefault;

            if ($wasDefault && ! $wantsDefault) {
                throw ValidationException::withMessages([
                    'is_default' => __('The default plan stays default until you make another plan the default.'),
                ]);
            }
            if ($wasDefault && array_key_exists('is_active', $data) && ! $data['is_active']) {
                throw ValidationException::withMessages([
                    'is_active' => __('The default plan cannot be deactivated.'),
                ]);
            }

            $this->apply($plan, $data);
            if ($wantsDefault) {
                $plan->is_active = true; // a default plan is always active
            }
            $plan->save();

            if ($wantsDefault && ! $wasDefault) {
                $this->makeDefault($plan);
            }

            return $plan->refresh();
        });
    }

    /** Flip `is_active`. The default plan cannot be switched off. */
    public function toggleActive(Plan $plan): Plan
    {
        if ($plan->is_default && $plan->is_active) {
            throw ValidationException::withMessages([
                'is_active' => __('The default plan cannot be deactivated.'),
            ]);
        }

        $plan->is_active = ! $plan->is_active;
        $plan->save();

        return $plan;
    }

    /** Make this plan the only default plan (and active). */
    public function setDefault(Plan $plan): Plan
    {
        return DB::transaction(function () use ($plan): Plan {
            $this->makeDefault($plan);

            return $plan->refresh();
        });
    }

    /** Soft-delete, unless it is the default plan or someone is subscribed to it. */
    public function delete(Plan $plan): void
    {
        if ($plan->is_default) {
            throw ValidationException::withMessages([
                'plan' => __('The default plan cannot be deleted. Make another plan the default first.'),
            ]);
        }

        $subscribers = $plan->subscribers()->count();
        if ($subscribers > 0) {
            throw ValidationException::withMessages([
                'plan' => trans_choice(
                    'This plan has :count subscriber, so it cannot be deleted. Deactivate it instead.|This plan has :count subscribers, so it cannot be deleted. Deactivate it instead.',
                    $subscribers,
                ),
            ]);
        }

        $plan->delete();
    }

    /** monthly × 12 × 0.8, rounded half-up to 2 decimals (prices are never negative). */
    public static function defaultYearlyPrice(string $monthly): string
    {
        $raw = bcmul(bcmul($monthly, '12', 4), self::YEARLY_FACTOR, 4);

        return bcadd($raw, '0.005', 2); // + half a cent, then truncate = round half-up
    }

    /**
     * Copy validated input onto the model and normalise the derived fields.
     *
     * @param  array<string, mixed>  $data
     */
    private function apply(Plan $plan, array $data): void
    {
        $plan->fill(collect($data)->except(['is_default', 'yearly_price', 'trial_days'])->all());

        $monthly = self::money($data['monthly_price'] ?? $plan->monthly_price ?? '0');
        $plan->monthly_price = $monthly;

        $yearly = $data['yearly_price'] ?? null;
        $plan->yearly_price = ($yearly === null || $yearly === '')
            ? self::defaultYearlyPrice($monthly)
            : self::money($yearly);

        if (! $plan->trial_enabled) {
            $plan->trial_days = 0;
        } else {
            $days = (int) ($data['trial_days'] ?? $plan->trial_days);
            if ($days < 1) {
                throw ValidationException::withMessages([
                    'trial_days' => __('Trial days must be at least 1 when the trial is enabled.'),
                ]);
            }
            $plan->trial_days = $days;
        }
    }

    /** Must run inside a transaction: unset every other default (locked), then set this one. */
    private function makeDefault(Plan $plan): void
    {
        Plan::withTrashed()
            ->where('is_default', true)
            ->whereKeyNot($plan->getKey())
            ->lockForUpdate()
            ->update(['is_default' => false]);

        $plan->forceFill(['is_default' => true, 'is_active' => true])->save();
    }

    /** A validated amount as a 2-decimal string ("19.9" → "19.90", 20 → "20.00"). */
    private static function money(mixed $value): string
    {
        return bcadd((string) $value, '0', 2);
    }
}
