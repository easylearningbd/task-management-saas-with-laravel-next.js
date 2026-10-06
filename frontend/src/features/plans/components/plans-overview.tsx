'use client'

import * as React from 'react'
import Link from 'next/link'
import { CircleAlert, Inbox, Plus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { toast } from '@/components/ui/toast'
import { useDeletePlan, usePlans } from '@/features/plans/api'
import { PlanCard } from '@/features/plans/components/plan-card'
import { PlanCardSkeleton } from '@/features/plans/components/plan-card-skeleton'
import type { BillingPeriod, Plan } from '@/features/plans/types'
import { toApiError } from '@/lib/api-error'

/* The body of /admin/plans from the Plans screenshot: centred "Subscription Plans" heading
   and intro, the Monthly | Yearly control with the green "+ Add Plan" beside it, then the plan
   cards — 1 per row on phones, 2 from `md`, 3 from `xl` (max 1120px, 32px gaps). The billing
   period only switches which stored price each card shows: no refetch. */
export function PlansOverview() {
  const t = useTranslations('plans.list')
  const plans = usePlans()
  const remove = useDeletePlan()
  const [period, setPeriod] = React.useState<BillingPeriod>('monthly')
  const [target, setTarget] = React.useState<Plan | null>(null)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)

  const openDelete = (plan: Plan) => {
    setDeleteError(null)
    setTarget(plan)
  }

  const confirmDelete = () => {
    if (!target) return
    remove.mutate(target.id, {
      onSuccess: () => {
        setTarget(null)
        toast.success(t('deleted'))
      },
      onError: (error) => {
        const apiError = toApiError(error)
        // Blocked deletes (default plan, subscribers) explain themselves in the dialog.
        setDeleteError(apiError.fieldErrors.plan ?? apiError.message)
      },
    })
  }

  return (
    <div>
      <div className="text-center">
        <h2 className="text-display">{t('heading')}</h2>
        <p className="mt-4 text-title-section font-normal text-muted-foreground">{t('intro')}</p>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
        <SegmentedControl<BillingPeriod>
          label={t('billingPeriod')}
          value={period}
          onValueChange={setPeriod}
          className="w-85 max-w-full"
          options={[
            { value: 'monthly', label: t('monthly') },
            {
              value: 'yearly',
              label: t('yearly'),
              extra: (
                <Badge tone="solid" size="sm">
                  {t('save')}
                </Badge>
              ),
            },
          ]}
        />
        <Button asChild>
          <Link href="/admin/plans/create">
            <Plus className="size-icon" aria-hidden="true" />
            {t('addPlan')}
          </Link>
        </Button>
      </div>

      <div className="mt-12">
        {plans.isPending ? (
          <div aria-busy="true" className="mx-auto grid max-w-280 grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <PlanCardSkeleton key={i} />
            ))}
          </div>
        ) : plans.isError ? (
          <EmptyState
            framed
            tone="danger"
            icon={CircleAlert}
            title={t('loadErrorTitle')}
            description={t('loadErrorDescription')}
            action={
              <Button variant="outline" loading={plans.isRefetching} onClick={() => void plans.refetch()}>
                {t('retry')}
              </Button>
            }
          />
        ) : plans.data.length === 0 ? (
          <EmptyState framed icon={Inbox} title={t('emptyTitle')} description={t('emptyDescription')} />
        ) : (
          <ul className="mx-auto grid max-w-280 grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
            {plans.data.map((plan) => (
              <li key={plan.id}>
                <PlanCard plan={plan} period={period} onDelete={openDelete} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <ConfirmDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null)
        }}
        title={t('deleteTitle')}
        description={target ? t('deleteBody', { name: target.name }) : ''}
        confirmLabel={t('deleteConfirm')}
        cancelLabel={t('cancel')}
        closeLabel={t('close')}
        onConfirm={confirmDelete}
        pending={remove.isPending}
        error={deleteError}
      />
    </div>
  )
}
