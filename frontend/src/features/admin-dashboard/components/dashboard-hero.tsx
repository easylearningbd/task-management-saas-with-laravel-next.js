'use client'

import * as React from 'react'
import Link from 'next/link'
import { Gift, Settings2, Tag } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { HeroBanner, HeroChip } from '@/components/ui/hero-banner'
import type { DashboardStats } from '@/features/admin-dashboard/types'
import { useDashboardFormat } from '@/features/admin-dashboard/format'

/* design/admin-dashboard/components/dashboard/hero-banner.tsx. Per HeroBanner.md the
   greeting follows the viewer's local clock and the name is the signed-in user's.
   Shortcuts link to their PRD §12 routes and hide below `sm`, as in the design. */

const SHORTCUTS = [
  { key: 'coupons', href: '/admin/coupons', icon: Tag },
  { key: 'referral', href: '/admin/referral', icon: Gift },
  { key: 'settings', href: '/admin/settings', icon: Settings2 },
] as const

function greetingKey(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning'
  if (hour < 18) return 'afternoon'
  return 'evening'
}

export function DashboardHero({ userName, stats, currency }: { userName: string; stats: DashboardStats; currency: string }) {
  const t = useTranslations('adminDashboard.hero')
  const f = useDashboardFormat(currency)
  // Rendered only in the browser (after the data query resolves), so this is the viewer's clock.
  const [hour] = React.useState(() => new Date().getHours())

  return (
    <HeroBanner>
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="text-body text-hero-muted">{t(greetingKey(hour))}</p>
          <p className="mt-0.5 flex items-center gap-2 text-display">
            {userName} <span aria-hidden="true">👋</span>
          </p>
          <p className="mt-1.5 text-body-sm text-hero-muted">{t('tagline')}</p>
          <p className="mt-3.5 flex items-center gap-2 text-body-sm font-medium text-hero-accent">
            <span aria-hidden="true" className="inline-flex gap-1">
              <span className="block size-[5px] rounded-full bg-hero-accent" />
              <span className="block size-[5px] rounded-full bg-hero-accent opacity-60" />
              <span className="block size-[5px] rounded-full bg-hero-accent opacity-30" />
            </span>
            {t('registeredCompanies', { count: stats.totalCompanies })}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <HeroChip value={f.count(stats.totalCompanies)} label={t('companies')} />
          <HeroChip value={f.percent(stats.companiesGrowth)} label={t('growth')} accent />
          <nav aria-label={t('shortcuts')} className="flex items-center gap-2.5 max-sm:hidden">
            {SHORTCUTS.map((shortcut) => (
              <Link
                key={shortcut.key}
                href={shortcut.href}
                className="flex h-14 w-[58px] flex-col items-center justify-center gap-1 rounded-lg text-hero-foreground transition-colors hover:bg-hero-chip focus-visible:shadow-focus focus-visible:outline-none"
              >
                <shortcut.icon className="size-[18px]" strokeWidth={1.75} aria-hidden="true" />
                <span className="text-[10px] leading-[12px] text-hero-muted">{t(shortcut.key)}</span>
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </HeroBanner>
  )
}
