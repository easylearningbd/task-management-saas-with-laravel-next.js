'use client'

import * as React from 'react'
import { Clock, Crown, Send, Zap } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PlanCard } from '@/components/shared/plan-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ComingSoon } from '@/components/ui/coming-soon'
import type { CatalogPlan, PlanDuration } from '@/features/billing/types'

/* One card of the company "Choose Your Plan" screenshots — the shared PlanCard with:
   - a solid "Recommended" pill on the top edge and a 2px `primary` frame for the recommended plan;
   - a `success` "Current" badge top-right when this plan AND the shown duration are the company's
     (Badge.md: no crown on a badge — Billing decision 3);
   - the footer, full width, top to bottom:
       current plan + duration → one disabled primary "Current Plan" with a Crown;
       an order pending        → a muted "Request pending" line (Clock), nothing to click;
       otherwise               → an outline "Start {n} Day Trial" (Zap) on a plan with a trial — or
                                 "Request Plan" (Send) on a plan without one — then the primary
                                 "Subscribe Now".
     A trial the company can't start (used before, or it's on this plan) stays visible but
     disabled, its reason in a tooltip. ButtonOutline.md: an outline button never takes a coloured
     border, so the trial button is the plain outline (the screenshot draws it green).
   The decisions (current, pending, trial availability) are the API's; the card only shows them. */

export function CompanyPlanCard({
  plan,
  period,
  isCurrent,
  onPlan,
  hasPending,
  onRequest,
  onTrial,
  onSubscribe,
}: {
  plan: CatalogPlan
  period: PlanDuration
  /** The company's plan AND duration. */
  isCurrent: boolean
  /** The company is on this plan (any duration) — a trial is then not possible. */
  onPlan: boolean
  hasPending: boolean
  onRequest: (plan: CatalogPlan) => void
  onTrial: (plan: CatalogPlan) => void
  /** Absent → "Subscribe Now" reads "Coming soon" (the checkout isn't there yet). */
  onSubscribe?: (plan: CatalogPlan) => void
}) {
  const t = useTranslations('billing.plans')
  const hasTrial = plan.trial_enabled && plan.trial_days > 0

  let footer: React.ReactNode
  if (isCurrent) {
    footer = (
      <Button className="w-full" disabled>
        <Crown className="size-icon" aria-hidden="true" />
        {t('currentPlan')}
      </Button>
    )
  } else if (hasPending) {
    footer = (
      <p className="flex h-control items-center justify-center gap-2 rounded-lg bg-muted text-body text-muted-foreground">
        <Clock className="size-icon" aria-hidden="true" />
        {t('requestPending')}
      </p>
    )
  } else {
    const trialReason = plan.trial_available ? null : plan.trial_used ? t('trialUsed') : onPlan ? t('trialOnPlan') : null
    const secondary = hasTrial ? (
      trialReason ? (
        // Visible, focusable, aria-disabled, the reason in its tooltip (the shared "not here" control).
        <ComingSoon label={trialReason}>
          <Button variant="outline" className="w-full" aria-description={trialReason}>
            <Zap className="size-icon" aria-hidden="true" />
            {t('startTrial', { days: plan.trial_days })}
          </Button>
        </ComingSoon>
      ) : (
        <Button variant="outline" className="w-full" onClick={() => onTrial(plan)}>
          <Zap className="size-icon" aria-hidden="true" />
          {t('startTrial', { days: plan.trial_days })}
        </Button>
      )
    ) : (
      <Button variant="outline" className="w-full" onClick={() => onRequest(plan)}>
        <Send className="size-icon" aria-hidden="true" />
        {t('requestPlan')}
      </Button>
    )

    const subscribe = onSubscribe ? (
      <Button className="w-full" onClick={() => onSubscribe(plan)}>
        {t('subscribe')}
      </Button>
    ) : (
      <ComingSoon>
        <Button className="w-full">{t('subscribe')}</Button>
      </ComingSoon>
    )

    footer = (
      <div className="flex flex-col gap-3">
        {secondary}
        {subscribe}
      </div>
    )
  }

  return (
    <PlanCard
      plan={plan}
      period={period}
      highlighted={plan.is_recommended}
      ribbon={plan.is_recommended ? <Badge tone="solid">{t('recommended')}</Badge> : undefined}
      corner={
        isCurrent ? (
          <Badge tone="success" outlined>
            {t('current')}
          </Badge>
        ) : undefined
      }
      footer={footer}
    />
  )
}
