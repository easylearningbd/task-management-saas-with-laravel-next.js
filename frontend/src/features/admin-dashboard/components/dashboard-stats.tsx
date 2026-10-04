'use client'

import { ArrowUpRight, Building2, CircleAlert, CreditCard, TrendingUp, Wallet } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { StatCard } from '@/components/ui/stat-card'
import type { DashboardStats as Stats } from '@/features/admin-dashboard/types'
import { useDashboardFormat } from '@/features/admin-dashboard/format'

/* design/admin-dashboard/components/dashboard/stat-cards.tsx — five tiles in the fixed hue
   order. 1 column, 2 from `sm`, 5 from `xl`. The amber tile carries the `warning`
   "Action needed" chip only while there are requests to act on (StatCard.md). */
export function DashboardStats({ stats, currency }: { stats: Stats; currency: string }) {
  const t = useTranslations('adminDashboard.stats')
  const f = useDashboardFormat(currency)

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        hue="emerald"
        icon={Wallet}
        label={t('totalRevenue')}
        value={f.money(stats.totalRevenue)}
        caption={t('totalRevenueCaption')}
        corner={
          <ArrowUpRight
            aria-hidden="true"
            className="absolute top-5 right-4.5 size-[18px] text-stat-emerald-icon"
            strokeWidth={1.75}
          />
        }
      />
      <StatCard
        hue="blue"
        icon={Building2}
        label={t('totalCompanies')}
        value={f.count(stats.totalCompanies)}
        caption={
          <>
            <TrendingUp className="size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
            {t('totalCompaniesCaption', { growth: f.signedPercent(stats.companiesGrowth) })}
          </>
        }
      />
      <StatCard
        hue="violet"
        icon={CreditCard}
        label={t('activePlans')}
        value={f.count(stats.activePlans)}
        caption={t('activePlansCaption')}
      />
      <StatCard
        hue="indigo"
        icon={TrendingUp}
        label={t('monthlyGrowth')}
        value={f.signedPercent(stats.monthlyGrowth)}
        caption={t('monthlyGrowthCaption')}
      />
      <StatCard
        hue="amber"
        icon={CircleAlert}
        label={t('pendingRequests')}
        value={f.count(stats.pendingRequests)}
        caption={t('pendingRequestsCaption')}
        corner={
          stats.pendingRequests > 0 ? (
            <span className="absolute top-3.5 right-3.5 inline-flex h-[22px] items-center rounded-md border border-stat-amber-icon-bg bg-warning-soft px-2 text-[11px] leading-none font-medium text-warning">
              {t('actionNeeded')}
            </span>
          ) : undefined
        }
      />
    </div>
  )
}
