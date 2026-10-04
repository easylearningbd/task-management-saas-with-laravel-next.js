'use client'

import { Inbox } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Card, CardHeading } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { ProgressBar } from '@/components/ui/progress-bar'
import type { TopPlan } from '@/features/admin-dashboard/types'
import { useDashboardFormat } from '@/features/admin-dashboard/format'
import { ViewAllLink } from '@/features/admin-dashboard/components/view-all-link'

/* design/admin-dashboard/components/dashboard/lists.tsx — TopPlans: a 28px `primary-soft`
   rank circle, the name over a ProgressBar scaled against the leader (ProgressBar.md), the
   subscriber count, and the `money` figure. A 0% bar stays as an empty track. */
export function TopPlans({ plans, currency }: { plans: TopPlan[]; currency: string }) {
  const t = useTranslations('adminDashboard')
  const f = useDashboardFormat(currency)
  const leader = Math.max(0, ...plans.map((plan) => plan.revenue))

  return (
    <Card className="flex h-full flex-col">
      <CardHeading
        title={t('topPlans.title')}
        subtitle={t('topPlans.subtitle')}
        action={<ViewAllLink href="/admin/plans" label={t('viewAll')} />}
      />
      {plans.length === 0 ? (
        <EmptyState icon={Inbox} title={t('topPlans.emptyTitle')} description={t('topPlans.emptyDescription')} />
      ) : (
        <ol className="flex flex-col gap-6.5 p-card pt-5 pb-2">
          {plans.map((plan, index) => (
            <li key={plan.id} className="flex items-center gap-3">
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-soft text-[13px] font-semibold text-primary-strong">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body font-medium">{plan.name}</p>
                <ProgressBar
                  className="mt-2"
                  value={leader > 0 ? (plan.revenue / leader) * 100 : 0}
                  label={t('topPlans.share', { plan: plan.name })}
                />
                <p className="mt-1.5 text-caption font-normal text-muted-foreground">
                  {t('topPlans.subscribers', { count: plan.subscribers })}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-money">{f.money(plan.revenue)}</p>
                <p className="mt-1 text-caption font-normal text-muted-foreground">{t('topPlans.revenue')}</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}
