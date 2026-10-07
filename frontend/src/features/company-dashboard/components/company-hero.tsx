'use client'

import * as React from 'react'
import { Banknote, Briefcase, SquareCheck, UserPlus } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ComingSoon } from '@/components/ui/coming-soon'
import { HeroBanner, HeroChip, type HeroDot } from '@/components/ui/hero-banner'
import { taskCompletionRate } from '@/features/company-dashboard/derive'
import { useCompanyDashboardFormat } from '@/features/company-dashboard/format'
import type { DashboardPerformance, DashboardStats } from '@/features/company-dashboard/types'

/* design/user-dashboard/components/company/hero-and-stats.tsx `CompanyHero` (PRD §6.1):
   "Good morning / afternoon / evening," over the company's real name (from /me), the
   tagline, the "{n} active projects" indicator; on the right the Projects and Tasks Done
   chips and four shortcuts (hidden below `sm`, as in the design). The shortcuts lead to
   pages that don't exist yet, so they are "Coming soon" buttons.
   The greeting follows the viewer's clock — companies have no time zone setting yet
   (Phase 0, decision 9). This renders only in the browser, after the data query. */

const DOTS: readonly HeroDot[] = [
  { left: '38%', top: '14%', size: 5, accent: false },
  { left: '72%', top: '10%', size: 5, accent: true },
  { left: '28%', top: '82%', size: 5, accent: false },
  { left: '66%', top: '86%', size: 5, accent: false },
  { left: '55%', top: '48%', size: 3, accent: false },
]

const SHORTCUTS = [
  { key: 'shortcutProjects', icon: Briefcase },
  { key: 'shortcutTasks', icon: SquareCheck },
  { key: 'shortcutInvoices', icon: Banknote },
  { key: 'shortcutClients', icon: UserPlus },
] as const

function greetingKey(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

export function CompanyHero({
  companyName,
  stats,
  performance,
  currency,
}: {
  companyName: string
  stats: DashboardStats
  performance: DashboardPerformance
  currency: string
}) {
  const t = useTranslations('companyDashboard.hero')
  const f = useCompanyDashboardFormat(currency)
  const [hour] = React.useState(() => new Date().getHours())

  return (
    <HeroBanner dots={DOTS}>
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="text-body text-hero-muted">{t(greetingKey(hour))}</p>
          <p className="mt-0.5 flex items-center gap-2 text-display">
            <span className="min-w-0 break-words">{companyName}</span> <span aria-hidden="true">👋</span>
          </p>
          <p className="mt-1.5 text-body-sm text-hero-muted">{t('tagline')}</p>
          <p className="mt-3.5 flex items-center gap-2 text-body-sm font-medium text-hero-accent">
            <span aria-hidden="true" className="inline-flex gap-1">
              <span className="block size-[5px] rounded-full bg-hero-accent" />
              <span className="block size-[5px] rounded-full bg-hero-accent opacity-60" />
              <span className="block size-[5px] rounded-full bg-hero-accent opacity-30" />
            </span>
            {t('activeProjects', { count: stats.activeProjects })}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <HeroChip value={f.count(stats.totalProjects)} label={t('projects')} />
          <HeroChip value={f.percent(taskCompletionRate(performance))} label={t('tasksDone')} accent />
          <nav aria-label={t('shortcuts')} className="flex items-center gap-2.5 max-sm:hidden">
            {SHORTCUTS.map((shortcut) => (
              <ComingSoon key={shortcut.key}>
                <button
                  type="button"
                  className="flex h-14 w-[58px] flex-col items-center justify-center gap-1 rounded-lg text-hero-foreground transition-colors focus-visible:shadow-focus focus-visible:outline-none"
                >
                  <shortcut.icon className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
                  <span className="text-[10px] leading-[12px] text-hero-muted">{t(shortcut.key)}</span>
                </button>
              </ComingSoon>
            ))}
          </nav>
        </div>
      </div>
    </HeroBanner>
  )
}
