'use client'

import * as React from 'react'
import { Box, CircleCheck, CircleX, HardDrive, Zap } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import type { BillingPeriod, Plan } from '@/features/plans/types'
import { usePlanFormat } from '@/features/plans/utils'
import { cn } from '@/lib/cn'

/* A plan card — the admin Plans screenshot and the company "Choose Your Plan" screenshot share it
   (Billing decision 2): `card` on `radius-xl` (brand-book: plan cards), centred name /
   `display-lg` price with its muted period / description / the `info` trial pill with `Zap`
   (Badge.md), then "What's included" (Projects: indigo `Box`, "Unlimited" for -1; Storage: amber
   `HardDrive`) and "Features" (AI Integration: `success` CircleCheck, or a muted CircleX), and the
   caller's footer pinned to the bottom. Cards in a row share a height, so footers line up.
   Slots (each optional):
     corner      — stacked badges at the top right (admin: Default / Active; company: Current);
     ribbon      — a node centred on the top edge (company: the solid "Recommended" pill);
     highlighted — a 2px `primary` frame instead of the 1px `border` (the recommended plan).
   Values come from the plan as exact strings, formatted once (features/plans/utils). */

export type PlanCardPlan = Pick<
  Plan,
  'name' | 'description' | 'monthly_price' | 'yearly_price' | 'max_projects' | 'is_unlimited' | 'storage_limit_gb' | 'trial_enabled' | 'trial_days' | 'ai_integration'
>

export function PlanCard({
  plan,
  period,
  footer,
  corner,
  ribbon,
  highlighted = false,
  busy = false,
  className,
}: {
  plan: PlanCardPlan
  period: BillingPeriod
  footer: React.ReactNode
  corner?: React.ReactNode
  ribbon?: React.ReactNode
  highlighted?: boolean
  busy?: boolean
  className?: string
}) {
  const t = useTranslations('plans.list')
  const f = usePlanFormat()
  const nameId = React.useId()

  return (
    <article
      aria-labelledby={nameId}
      aria-busy={busy || undefined}
      className={cn(
        'relative flex h-full flex-col rounded-xl bg-card shadow-xs',
        highlighted ? 'border-2 border-primary' : 'border border-border',
        className,
      )}
    >
      {ribbon ? <div className="absolute -top-3 left-1/2 -translate-x-1/2">{ribbon}</div> : null}
      {corner ? <div className="absolute top-4 right-4 flex flex-col items-end gap-1">{corner}</div> : null}

      <div className="px-6 pt-6 pb-6 text-center">
        {/* px-14 keeps a long name clear of the corner badges while staying centred. */}
        <h3 id={nameId} className="px-14 text-title-page break-words">
          {plan.name}
        </h3>
        <p className="mt-2 flex flex-wrap items-baseline justify-center gap-x-1">
          <span className="text-display-lg">{f.price(plan, period)}</span>
          <span className="text-title-card font-normal text-muted-foreground">
            {period === 'yearly' ? t('perYearly') : t('perMonthly')}
          </span>
        </p>
        {plan.description ? <p className="mt-4 pb-3 text-body text-muted-foreground">{plan.description}</p> : null}
        {plan.trial_enabled ? (
          <Badge tone="info" outlined className="mt-1">
            <Zap className="size-3.5" aria-hidden="true" />
            {f.trial(plan)}
          </Badge>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col border-t border-border p-6">
        <h4 className="text-body-sm font-semibold tracking-wider uppercase">{t('whatsIncluded')}</h4>
        <dl className="mt-3 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-body">
              <Box className="size-icon text-stat-indigo-icon" aria-hidden="true" />
              {t('projects')}
            </dt>
            <dd className="text-body font-medium">{f.projects(plan)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-2 text-body">
              <HardDrive className="size-icon text-stat-amber-icon" aria-hidden="true" />
              {t('storage')}
            </dt>
            <dd className="text-body font-medium">{f.storage(plan)}</dd>
          </div>
        </dl>

        <h4 className="mt-6 text-body-sm font-semibold tracking-wider uppercase">{t('features')}</h4>
        <ul className="mt-3">
          <li className={cn('flex items-center gap-2 text-body', !plan.ai_integration && 'text-muted-foreground')}>
            {plan.ai_integration ? (
              <CircleCheck className="size-icon text-success" aria-hidden="true" />
            ) : (
              <CircleX className="size-icon text-muted-foreground" aria-hidden="true" />
            )}
            {t('aiIntegration')}
            <span className="sr-only">({plan.ai_integration ? t('included') : t('notIncluded')})</span>
          </li>
        </ul>

        <div className="mt-auto pt-6">{footer}</div>
      </div>
    </article>
  )
}
