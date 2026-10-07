'use client'

import { ArrowUpRight, DollarSign, FolderOpen, SquareCheck, TrendingUp, Users } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { StatCard } from '@/components/ui/stat-card'
import { useCompanyDashboardFormat } from '@/features/company-dashboard/format'
import type { DashboardStats } from '@/features/company-dashboard/types'

/* design/user-dashboard hero-and-stats.tsx `CompanyStatCards`: four compact (123px) stat
   cards — Total Projects (blue), Active Tasks (violet), Total Clients (indigo), Total
   Revenue (emerald) — one column, two from `sm`, four from `xl`. The first three carry the
   design's ↗ corner glyph in their hue; the projects caption leads with a TrendingUp glyph. */

function Trend({ className }: { className: string }) {
  return <ArrowUpRight aria-hidden="true" className={`absolute top-4 right-4 size-4 ${className}`} strokeWidth={1.75} />
}

export function CompanyStats({ stats, currency }: { stats: DashboardStats; currency: string }) {
  const t = useTranslations('companyDashboard.stats')
  const f = useCompanyDashboardFormat(currency)

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        size="compact"
        hue="blue"
        icon={FolderOpen}
        label={t('totalProjects')}
        value={f.count(stats.totalProjects)}
        corner={<Trend className="text-stat-blue-icon" />}
        caption={
          <>
            <TrendingUp className="size-3.5 shrink-0" strokeWidth={2} aria-hidden="true" />
            {t('totalProjectsCaption', { growth: f.signedPercent(stats.projectsGrowth) })}
          </>
        }
      />
      <StatCard
        size="compact"
        hue="violet"
        icon={SquareCheck}
        label={t('activeTasks')}
        value={f.count(stats.activeTasks)}
        corner={<Trend className="text-stat-violet-icon" />}
        caption={t('activeTasksCaption', { count: f.count(stats.completedTasks) })}
      />
      <StatCard
        size="compact"
        hue="indigo"
        icon={Users}
        label={t('totalClients')}
        value={f.count(stats.totalClients)}
        corner={<Trend className="text-stat-indigo-icon" />}
        caption={t('totalClientsCaption', { count: f.count(stats.activeClients) })}
      />
      <StatCard
        size="compact"
        hue="emerald"
        icon={DollarSign}
        label={t('totalRevenue')}
        value={f.money(stats.totalRevenue)}
        caption={t('totalRevenueCaption', { amount: f.money(stats.paidRevenue) })}
      />
    </div>
  )
}
