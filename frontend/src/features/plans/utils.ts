'use client'

import * as React from 'react'
import { useFormatter, useTranslations } from 'next-intl'
import type { BillingPeriod, Plan } from '@/features/plans/types'

/* One source of truth for how a plan's numbers are shown — used by the list cards and the
   form. Values arrive as exact strings from the API; nothing here does arithmetic on money. */

/** Plans are priced in USD until the Currency module (PRD §8.7) makes this a setting. */
export const PLAN_CURRENCY = 'USD'

/** The stored price for the selected billing period (no client-side recomputation). */
export function priceFor(plan: Pick<Plan, 'monthly_price' | 'yearly_price'>, period: BillingPeriod): string {
  return period === 'yearly' ? plan.yearly_price : plan.monthly_price
}

/** "1.00" → "1", "1.50" → "1.5", "12.25" → "12.25" — string-only, no float rounding. */
export function trimDecimal(value: string): string {
  if (!value.includes('.')) return value
  return value.replace(/\.?0+$/, '')
}

export function usePlanFormat() {
  const format = useFormatter()
  const t = useTranslations('plans.format')

  return React.useMemo(
    () => ({
      /** "$19.99" — two decimals and the symbol, always (brand-book.md, Data display). */
      money: (amount: string) => format.number(Number(amount), { style: 'currency', currency: PLAN_CURRENCY }),
      price: (plan: Pick<Plan, 'monthly_price' | 'yearly_price'>, period: BillingPeriod) =>
        format.number(Number(priceFor(plan, period)), { style: 'currency', currency: PLAN_CURRENCY }),
      /** "3", "25" or "Unlimited" — never ∞ or "-" (brand-book.md). */
      projects: (plan: Pick<Plan, 'max_projects' | 'is_unlimited'>) =>
        plan.is_unlimited ? t('unlimited') : format.number(plan.max_projects),
      /** "1 GB", "50 GB", "1.5 GB". */
      storage: (plan: Pick<Plan, 'storage_limit_gb'>) => t('storage', { value: trimDecimal(plan.storage_limit_gb) }),
      /** "7 days free trial" — only meaningful when `trial_enabled`. */
      trial: (plan: Pick<Plan, 'trial_days'>) => t('trialDays', { count: plan.trial_days }),
    }),
    [format, t],
  )
}
