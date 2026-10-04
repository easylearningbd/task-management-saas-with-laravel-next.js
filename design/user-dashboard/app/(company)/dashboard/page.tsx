import * as React from 'react'
import { Plus } from 'lucide-react'
import { AppShell, PageHeader } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/primitives'
import { COMPANY_SECTIONS, COMPANY_USER, CompanyPlanCard, StartButton } from '@/components/company/shell-config'
import { CompanyHero, CompanyStatCards } from '@/components/company/hero-and-stats'
import {
  PerformanceOverview, ProjectProgress, TaskDeadlines, InvoiceDeadlines,
  RecentContracts, RecentTasks,
} from '@/components/company/panels'
import { AreaChartCard, BarChartCard } from '@/components/charts/charts'
import { revenueByMonth, hoursByMonth, money } from '@/lib/company-data'

export default function CompanyDashboardPage() {
  return (
    <AppShell
      crumbs={['Dashboard']}
      sections={COMPANY_SECTIONS}
      sidebarFooter={<CompanyPlanCard />}
      user={COMPANY_USER}
      topbarActions={<StartButton />}
    >
      <PageHeader
        title="Dashboard"
        subtitle="Welcome to your company dashboard."
        action={
          <Button variant="primary">
            <Plus className="size-icon" />
            Quick Access
          </Button>
        }
      />

      <div className="mt-3 flex flex-col gap-6 rounded-xl border border-border p-4 md:p-card">
        <CompanyHero />
        <CompanyStatCards />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <PerformanceOverview />
          <ProjectProgress />
        </div>

        <AreaChartCard
          title="Monthly Revenue"
          subtitle="Paid invoices revenue per month — 2026"
          badge={money(revenueByMonth.reduce((a, b) => a + b, 0))}
          values={revenueByMonth}
          max={3600}
          ticks={[3600, 2700, 1800, 900, 0]}
          format={money}
          gradientId="company-revenue-fill"
        />

        <BarChartCard
          title="Timesheet Hours"
          subtitle="Logged hours per month — 2026"
          badge={`${hoursByMonth.reduce((a, b) => a + b, 0)} h total`}
          badgeTone="info"
          values={hoursByMonth}
          max={100}
          ticks={[100, 75, 50, 25, 0]}
          suffix="h"
          unit="Hours"
        />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <TaskDeadlines />
          <InvoiceDeadlines />
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <RecentContracts />
          <RecentTasks />
        </div>
      </div>
    </AppShell>
  )
}
