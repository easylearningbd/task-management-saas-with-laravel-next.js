'use client'

import * as React from 'react'
import Link from 'next/link'
import { Box, CircleCheck, CircleX, HardDrive, SquarePen, Trash2, Zap } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'
import { useTogglePlanActive } from '@/features/plans/api'
import type { BillingPeriod, Plan } from '@/features/plans/types'
import { usePlanFormat } from '@/features/plans/utils'
import { toApiError } from '@/lib/api-error'
import { cn } from '@/lib/cn'

/* A plan card from the Plans screenshot: `card` on `radius-xl` (brand-book: plan cards),
   stacked outlined badges top-right, centred name / `display-lg` price / description / trial
   pill, then "What's included" and "Features", and a footer panel pinned to the bottom with
   the Active switch, edit and (not for the default plan) delete. Cards in a row share a
   height, so the footers line up. */
export function PlanCard({
  plan,
  period,
  onDelete,
}: {
  plan: Plan
  period: BillingPeriod
  onDelete: (plan: Plan) => void
}) {
  const t = useTranslations('plans.list')
  const f = usePlanFormat()
  const toggle = useTogglePlanActive()
  const nameId = React.useId()
  const switchId = React.useId()

  const onToggle = () => {
    toggle.mutate(plan.id, {
      onSuccess: (saved) => toast.success(saved.is_active ? t('activated') : t('deactivated')),
      onError: (error) => {
        const apiError = toApiError(error)
        toast.error(t('toggleFailed'), apiError.fieldErrors.is_active ?? apiError.message)
      },
    })
  }

  return (
    <article
      aria-labelledby={nameId}
      aria-busy={toggle.isPending || undefined}
      className="relative flex h-full flex-col rounded-xl border border-border bg-card shadow-xs"
    >
      <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
        {plan.is_default ? (
          <Badge tone="info" outlined>
            {t('default')}
          </Badge>
        ) : null}
        <Badge tone={plan.is_active ? 'success' : 'neutral'} outlined>
          {plan.is_active ? t('active') : t('inactive')}
        </Badge>
      </div>

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

        <div className="mt-auto pt-6">
          <div className="flex items-center justify-between gap-3 rounded-lg bg-background px-3 py-3.5">
            <div className="flex items-center gap-2">
              <Switch
                id={switchId}
                checked={plan.is_active}
                onCheckedChange={onToggle}
                disabled={toggle.isPending}
              />
              <Label htmlFor={switchId} className="text-body font-normal">
                {t('activeSwitch')}
              </Label>
              {toggle.isPending ? <Spinner className="text-muted-foreground" /> : null}
            </div>
            <div className="flex items-center gap-1">
              <Button asChild variant="ghost" size="icon-sm">
                <Link href={`/admin/plans/${plan.id}/edit`} aria-label={t('edit', { name: plan.name })}>
                  <SquarePen className="size-icon" aria-hidden="true" />
                </Link>
              </Button>
              {/* The default plan can't be deleted, so it shows no delete action at all. */}
              {plan.is_default ? null : (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t('delete', { name: plan.name })}
                  onClick={() => onDelete(plan)}
                  className="hover:bg-danger-soft hover:text-danger"
                >
                  <Trash2 className="size-icon" aria-hidden="true" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </article>
  )
}
