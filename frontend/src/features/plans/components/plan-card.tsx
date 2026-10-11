'use client'

import * as React from 'react'
import Link from 'next/link'
import { SquarePen, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PlanCard as PlanCardFrame } from '@/components/shared/plan-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'
import { useTogglePlanActive } from '@/features/plans/api'
import type { BillingPeriod, Plan } from '@/features/plans/types'
import { toApiError } from '@/lib/api-error'

/* A plan card from the admin Plans screenshot — the shared PlanCard (components/shared/plan-card,
   also the company Plans page's) with the admin's parts: stacked outlined badges top-right
   (Default, Active / Inactive) and a footer panel with the Active switch, edit and (not for the
   default plan) delete. */
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
  const toggle = useTogglePlanActive()
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
    <PlanCardFrame
      plan={plan}
      period={period}
      busy={toggle.isPending}
      corner={
        <>
          {plan.is_default ? (
            <Badge tone="info" outlined>
              {t('default')}
            </Badge>
          ) : null}
          <Badge tone={plan.is_active ? 'success' : 'neutral'} outlined>
            {plan.is_active ? t('active') : t('inactive')}
          </Badge>
        </>
      }
      footer={
        <div className="flex items-center justify-between gap-3 rounded-lg bg-background px-3 py-3.5">
          <div className="flex items-center gap-2">
            <Switch id={switchId} checked={plan.is_active} onCheckedChange={onToggle} disabled={toggle.isPending} />
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
      }
    />
  )
}
