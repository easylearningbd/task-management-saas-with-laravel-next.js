'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CircleAlert, Inbox } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PageHeader } from '@/components/layout/app-shell'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { toast } from '@/components/ui/toast'
import { toApiError } from '@/lib/api-error'
import { PlanCardSkeleton } from '@/features/plans/components/plan-card-skeleton'
import { priceFor, usePlanFormat } from '@/features/plans/utils'
import { usePlans, useRequestPlan, useStartTrial, useSubscribeFree } from '@/features/billing/api'
import { CompanyPlanCard } from '@/features/billing/components/company-plan-card'
import type { CatalogPlan, PlanDuration } from '@/features/billing/types'
import { useSyncMeWithCatalog } from '@/features/billing/use-plan-sync'

/* /plans — PAGE SPEC A and the two "Choose Your Plan" screenshots: the header ("Plans",
   "Manage and choose your subscription plan"), then one container card: the centred heading and
   intro, the Monthly | Yearly SegmentedControl (its "Save 20%" pill on Yearly — client-side only,
   it switches which stored price every card shows), and the plan cards from the live `plans`
   table (active, in `sort_order`; 1 per row on phones, 2 from `md`, 3 from `xl`).
   - "Current" = the company's plan AND duration (Pro Yearly is current only in the Yearly view).
   - While an order is pending, an `info` banner above the grid links to Plan Requests and every
     card shows "Request pending" instead of its buttons.
   - Request Plan, Start Trial and a $0 Subscribe Now each confirm first (ConfirmDialog, primary):
     a request goes to an administrator; a trial and the $0 plan apply at once — the $0 dialog warns
     that the limits change. Each refreshes the page, /me (header + sidebar) and the plan usage.
   - A paid Subscribe Now opens the checkout (/plans/checkout?plan=…&duration=…).
   States: skeleton cards while loading; an error with Try again; "No plans available". */

type Action = { kind: 'request' | 'trial' | 'free'; plan: CatalogPlan }

const isZero = (amount: string) => Number(amount) === 0

export function PlansPage() {
  const t = useTranslations('billing.plans')
  const f = usePlanFormat()
  const router = useRouter()
  const catalog = usePlans()
  const request = useRequestPlan()
  const trial = useStartTrial()
  const free = useSubscribeFree()
  const [period, setPeriod] = React.useState<PlanDuration>('monthly')
  const [action, setAction] = React.useState<Action | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const data = catalog.data
  const plans = data?.plans ?? []
  const current = data?.current
  const currentPlan = plans.find((plan) => plan.id === current?.plan_id)
  const fallbackPlan = plans.find((plan) => plan.is_default)
  const pending = data?.pending_order ?? null
  useSyncMeWithCatalog(current)

  const open = (kind: Action['kind']) => (plan: CatalogPlan) => {
    setError(null)
    setAction({ kind, plan })
  }

  const confirm = () => {
    if (!action) return
    const { kind, plan } = action
    const mutation = kind === 'request' ? request : kind === 'trial' ? trial : free
    mutation.mutate(
      { plan_id: plan.id, duration: period },
      {
        onSuccess: () => {
          setAction(null)
          toast.success(t(`${kind}.done`, { plan: plan.name }))
        },
        onError: (failure) => {
          const apiError = toApiError(failure)
          // The rule the server applied (pending order, trial used, …) — or the generic message.
          setError(Object.values(apiError.fieldErrors)[0] ?? apiError.message ?? t('failed'))
        },
      },
    )
  }

  const pendingAction = request.isPending || trial.isPending || free.isPending

  const dialog = action
    ? {
        title:
          action.kind === 'trial'
            ? t('trial.title', { days: action.plan.trial_days, plan: action.plan.name })
            : t(`${action.kind}.title`, { plan: action.plan.name }),
        description:
          action.kind === 'request'
            ? t('request.body', { plan: action.plan.name, duration: t(`duration.${period}`) })
            : action.kind === 'trial'
              ? t('trial.body', { plan: action.plan.name, days: action.plan.trial_days, fallback: fallbackPlan?.name ?? '—' })
              : t('free.body', {
                  plan: action.plan.name,
                  current: currentPlan?.name ?? '—',
                  projects: f.projects(action.plan),
                  storage: f.storage(action.plan),
                }),
        confirm: t(`${action.kind}.confirm`, { plan: action.plan.name }),
      }
    : null

  const requestsLink = (
    <Link href="/plans/requests" className="font-medium underline underline-offset-2 focus-visible:shadow-focus focus-visible:outline-none">
      {t('pending.link')}
    </Link>
  )

  let body: React.ReactNode
  if (catalog.isPending) {
    body = (
      <div aria-busy="true" className="mx-auto grid max-w-280 grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }, (_, i) => (
          <PlanCardSkeleton key={i} />
        ))}
      </div>
    )
  } else if (catalog.isError) {
    body = (
      <EmptyState
        tone="danger"
        icon={CircleAlert}
        title={t('error.title')}
        description={toApiError(catalog.error).message}
        action={
          <Button variant="outline" loading={catalog.isRefetching} onClick={() => void catalog.refetch()}>
            {t('error.retry')}
          </Button>
        }
      />
    )
  } else if (plans.length === 0) {
    body = <EmptyState icon={Inbox} title={t('empty.title')} description={t('empty.description')} />
  } else {
    body = (
      <ul aria-label={t('gridLabel')} className="mx-auto grid max-w-280 grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
        {plans.map((plan) => {
          const freeHere = isZero(priceFor(plan, period))
          return (
            <li key={plan.id}>
              <CompanyPlanCard
                plan={plan}
                period={period}
                isCurrent={current?.plan_id === plan.id && current.duration === period}
                onPlan={current?.plan_id === plan.id}
                hasPending={pending !== null}
                onRequest={open('request')}
                onTrial={open('trial')}
                // A $0 plan confirms and applies at once; a paid one opens the checkout.
                onSubscribe={freeHere ? open('free') : (picked) => router.push(`/plans/checkout?plan=${picked.id}&duration=${period}`)}
              />
            </li>
          )
        })}
      </ul>
    )
  }

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} />

      <Card className="mt-4 px-card py-10 md:px-10">
        <div className="text-center">
          <h2 className="text-display">{t('heading')}</h2>
          <p className="mt-4 text-title-section font-normal text-muted-foreground">{t('intro')}</p>
        </div>

        <div className="mt-8 flex justify-center">
          <SegmentedControl<PlanDuration>
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
        </div>

        {pending ? (
          <Alert tone="info" title={t('pending.title', { plan: pending.plan?.name ?? '—', duration: pending.duration_label })} className="mx-auto mt-8 max-w-280">
            {t('pending.description')} {requestsLink}
          </Alert>
        ) : null}

        <div className="mt-12">{body}</div>
      </Card>

      <ConfirmDialog
        tone="primary"
        open={action !== null}
        onOpenChange={(next) => {
          if (!next) setAction(null)
        }}
        title={dialog?.title ?? ''}
        description={dialog?.description ?? ''}
        confirmLabel={dialog?.confirm ?? ''}
        cancelLabel={t('dialog.cancel')}
        closeLabel={t('dialog.close')}
        onConfirm={confirm}
        pending={pendingAction}
        error={error}
      />
    </>
  )
}
