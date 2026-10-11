<?php

namespace App\Enums;

/**
 * What a plan order is (the single `plan_orders` model):
 *  - request:  Request Plan — no payment step, waits for an admin;
 *  - purchase: Subscribe Now — a paid checkout waiting for an admin, or a $0 plan applied at once;
 *  - trial:    Start N Day Trial — applied at once (one per plan per company, ever).
 */
enum PlanOrderType: string
{
    case Request = 'request';
    case Purchase = 'purchase';
    case Trial = 'trial';

    public function label(): string
    {
        return match ($this) {
            self::Request => __('Plan Request'),
            self::Purchase => __('Purchase'),
            self::Trial => __('Trial'),
        };
    }
}
