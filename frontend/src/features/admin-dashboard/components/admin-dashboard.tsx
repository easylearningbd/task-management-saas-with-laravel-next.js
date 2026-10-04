'use client'

import { CircleAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { useAdminDashboard } from '@/features/admin-dashboard/api'
import { CompaniesChart } from '@/features/admin-dashboard/components/companies-chart'
import { DashboardHero } from '@/features/admin-dashboard/components/dashboard-hero'
import { DashboardSkeleton } from '@/features/admin-dashboard/components/dashboard-skeleton'
import { DashboardStats } from '@/features/admin-dashboard/components/dashboard-stats'
import { RecentCompanies } from '@/features/admin-dashboard/components/recent-companies'
import { RevenueChart } from '@/features/admin-dashboard/components/revenue-chart'
import { TopPlans } from '@/features/admin-dashboard/components/top-plans'

/* Everything under the page header in design/admin-dashboard/app/(super-admin)/dashboard/
   page.tsx: one bordered container (`p-4`, `p-card` from `md`) stacking the sections
   `space-6` apart. Client-side because the data comes from TanStack Query. */
export function AdminDashboard({ userName }: { userName: string }) {
  const t = useTranslations('adminDashboard.loadError')
  const { data, isPending, isError, refetch, isRefetching } = useAdminDashboard()

  return (
    <div className="mt-3 rounded-xl border border-border p-4 md:p-card">
      {isPending ? (
        <DashboardSkeleton />
      ) : isError ? (
        <EmptyState
          tone="danger"
          icon={CircleAlert}
          title={t('title')}
          description={t('description')}
          action={
            <Button variant="outline" loading={isRefetching} onClick={() => void refetch()}>
              {t('retry')}
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          <DashboardHero userName={userName} stats={data.stats} currency={data.currency} />
          <DashboardStats stats={data.stats} currency={data.currency} />
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
            <div className="lg:col-span-3">
              <RecentCompanies companies={data.recentCompanies} currency={data.currency} />
            </div>
            <div className="lg:col-span-2">
              <TopPlans plans={data.topPlans} currency={data.currency} />
            </div>
          </div>
          <CompaniesChart years={data.chartYears} currency={data.currency} />
          <RevenueChart years={data.chartYears} currency={data.currency} />
        </div>
      )}
    </div>
  )
}
