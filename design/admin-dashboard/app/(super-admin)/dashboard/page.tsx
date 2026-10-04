import * as React from 'react'
import { RefreshCw } from 'lucide-react'
import { AppShell, PageHeader } from '@/components/shell/app-shell'
import { Button } from '@/components/ui/primitives'
import { HeroBanner } from '@/components/dashboard/hero-banner'
import { StatCards } from '@/components/dashboard/stat-cards'
import { RecentCompanies, TopPlans } from '@/components/dashboard/lists'
import { CompaniesBarChart, RevenueAreaChart } from '@/components/dashboard/charts'

export default function DashboardPage() {
  return (
    <AppShell crumbs={['Dashboard']}>
      <PageHeader
        title="Dashboard"
        subtitle="System overview — companies, revenue, plans and recent activity."
        action={
          <Button variant="outline">
            <RefreshCw className="size-icon" />
            Refresh
          </Button>
        }
      />

      <div className="mt-3 flex flex-col gap-6 rounded-xl border border-border p-4 md:p-card">
        <HeroBanner />
        <StatCards />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <RecentCompanies />
          </div>
          <div className="lg:col-span-2">
            <TopPlans />
          </div>
        </div>
        <CompaniesBarChart />
        <RevenueAreaChart />
      </div>
    </AppShell>
  )
}
