'use client'

import { CircleAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { useMe } from '@/features/auth/api'
import { useCompanyDashboard } from '@/features/company-dashboard/api'
import { CompanyDashboardSkeleton } from '@/features/company-dashboard/components/company-dashboard-skeleton'
import { CompanyHero } from '@/features/company-dashboard/components/company-hero'
import { CompanyStats } from '@/features/company-dashboard/components/company-stats'
import { HoursChart } from '@/features/company-dashboard/components/hours-chart'
import { InvoiceDeadlines } from '@/features/company-dashboard/components/invoice-deadlines'
import { PerformanceOverview } from '@/features/company-dashboard/components/performance-overview'
import { ProjectProgress } from '@/features/company-dashboard/components/project-progress'
import { RecentContracts } from '@/features/company-dashboard/components/recent-contracts'
import { RecentTasks } from '@/features/company-dashboard/components/recent-tasks'
import { RevenueChart } from '@/features/company-dashboard/components/revenue-chart'
import { TaskDeadlines } from '@/features/company-dashboard/components/task-deadlines'

/* Everything under the page header in design/user-dashboard/app/(company)/dashboard/page.tsx:
   one bordered container (`p-4`, `p-card` from `md`) stacking the sections `space-6` apart —
   hero · stat cards · Performance | Project Progress · Monthly Revenue · Timesheet Hours ·
   Task | Invoice deadlines · Recent Contracts | Recent Tasks (the two-column rows from `lg`,
   one column below). Client-side because the data comes from TanStack Query.
   The company's name is the live /me value (the shell's session watch keeps it fresh), with
   the server's copy as the first value — never the dashboard payload. */
export function CompanyDashboard({ companyName }: { companyName: string }) {
  const t = useTranslations('companyDashboard.loadError')
  const me = useMe()
  const { data, isPending, isError, refetch, isRefetching } = useCompanyDashboard()
  const name = me.data?.name ?? companyName

  return (
    <div className="mt-3 rounded-xl border border-border p-4 md:p-card">
      {isPending ? (
        <CompanyDashboardSkeleton />
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
          <CompanyHero companyName={name} stats={data.stats} performance={data.performance} currency={data.currency} />
          <CompanyStats stats={data.stats} currency={data.currency} />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <PerformanceOverview performance={data.performance} currency={data.currency} />
            <ProjectProgress projects={data.projects} currency={data.currency} />
          </div>

          <RevenueChart />
          <HoursChart />

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <TaskDeadlines deadlines={data.taskDeadlines} />
            <InvoiceDeadlines deadlines={data.invoiceDeadlines} currency={data.currency} />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <RecentContracts contracts={data.recentContracts} currency={data.currency} />
            <RecentTasks tasks={data.recentTasks} />
          </div>
        </div>
      )}
    </div>
  )
}
