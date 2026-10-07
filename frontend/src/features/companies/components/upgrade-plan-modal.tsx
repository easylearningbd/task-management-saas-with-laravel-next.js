'use client'

import * as React from 'react'
import { CircleCheck, CreditCard } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { FormModal } from '@/components/shared/form-modal'
import { Alert } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { LabeledSwitch } from '@/components/ui/labeled-switch'
import { RadioCardGroup, type RadioCardOption } from '@/components/ui/radio-card-group'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { useChangeCompanyPlan } from '@/features/companies/api'
import type { Company, PlanDuration } from '@/features/companies/types'
import { usePlans } from '@/features/plans/api'
import { usePlanFormat } from '@/features/plans/utils'
import { toApiError } from '@/lib/api-error'

/* Upgrade Plan for Company — PAGE SPEC C and the Upgrade Plan screenshot: title + subtitle and a
   rule; a `muted` band holding the two-label switch "Monthly ◯ Yearly" (the active word green);
   one radio card per active plan — name, a "Current" badge on the company's plan, the price for
   the chosen period behind a CreditCard glyph, the description, an "AI Integration" chip; the
   selected card has the primary frame on primary-soft. The current plan and duration are
   preselected; "Upgrade Plan" stays disabled until something changes. A manual assignment —
   no payment, invoice or plan order. Width: 672px, as measured in the screenshot. */
export function UpgradePlanModal({
  open,
  company,
  onOpenChange,
}: {
  open: boolean
  /** Kept while closing; give the modal a new `key` per opening for a fresh selection. */
  company: Company | null
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations('companies.upgrade')
  const plans = usePlans()
  const f = usePlanFormat()
  const change = useChangeCompanyPlan(company?.id ?? 0)
  const [error, setError] = React.useState<string | null>(null)

  const initialDuration: PlanDuration = company?.plan_duration ?? 'monthly'
  const [duration, setDuration] = React.useState<PlanDuration>(initialDuration)
  const [planId, setPlanId] = React.useState<string | null>(company?.plan ? String(company.plan.id) : null)
  const changed = planId !== null && (planId !== String(company?.plan?.id ?? '') || duration !== initialDuration)

  const options = React.useMemo<RadioCardOption<string>[]>(
    () =>
      (plans.data ?? [])
        .filter((plan) => plan.is_active)
        .map((plan) => ({
          value: String(plan.id),
          title: (
            <>
              <span className="text-title-card text-foreground">{plan.name}</span>
              {company?.plan?.id === plan.id ? (
                <Badge tone="info" outlined>
                  {t('current')}
                </Badge>
              ) : null}
            </>
          ),
          description: (
            <span className="flex flex-col gap-1.5">
              <span className="inline-flex items-center gap-1.5">
                <CreditCard className="size-icon shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="text-title-card text-foreground">{f.price(plan, duration)}</span>
                <span className="text-body text-muted-foreground">{duration === 'yearly' ? t('perYearly') : t('perMonthly')}</span>
              </span>
              {plan.description ? <span className="text-body text-muted-foreground">{plan.description}</span> : null}
              {plan.ai_integration ? (
                <Badge tone="success" outlined className="w-fit">
                  <CircleCheck className="size-3.5" aria-hidden="true" />
                  {t('aiIntegration')}
                </Badge>
              ) : null}
            </span>
          ),
        })),
    [plans.data, company?.plan?.id, duration, f, t],
  )

  const submit = (event: React.FormEvent) => {
    event.preventDefault()
    if (!company || !planId || !changed) return
    setError(null)
    change.mutate(
      { plan_id: Number(planId), duration },
      {
        onSuccess: () => {
          toast.success(t('updated'))
          onOpenChange(false)
        },
        onError: (e) => {
          const apiError = toApiError(e)
          setError(apiError.fieldErrors.plan_id ?? apiError.fieldErrors.duration ?? apiError.message)
        },
      },
    )
  }

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('title')}
      description={t('subtitle')}
      onSubmit={submit}
      submitLabel={t('submit')}
      cancelLabel={t('cancel')}
      submitDisabled={!changed}
      pending={change.isPending}
      error={error}
      size="md"
      divided
      toolbar={
        <div className="flex justify-center bg-muted py-3">
          <LabeledSwitch
            checked={duration === 'yearly'}
            onCheckedChange={(yearly) => setDuration(yearly ? 'yearly' : 'monthly')}
            offLabel={t('monthly')}
            onLabel={t('yearly')}
            label={t('billingLabel')}
          />
        </div>
      }
    >

      {plans.isPending ? (
        <div className="flex flex-col gap-4" aria-hidden="true">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : options.length === 0 ? (
        <Alert tone="info">{t('noPlans')}</Alert>
      ) : (
        <RadioCardGroup label={t('plansLabel')} value={planId} onValueChange={setPlanId} options={options} />
      )}
    </FormModal>
  )
}
