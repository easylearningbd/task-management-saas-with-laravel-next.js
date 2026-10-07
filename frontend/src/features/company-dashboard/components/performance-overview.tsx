'use client'

import { Activity, FileText, Target, TrendingUp, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Card, CardHeading } from '@/components/ui/card'
import { ProgressBar } from '@/components/ui/progress-bar'
import { invoicePaymentRate, netProfit, profitMargin, taskCompletionRate } from '@/features/company-dashboard/derive'
import { useCompanyDashboardFormat } from '@/features/company-dashboard/format'
import type { DashboardPerformance } from '@/features/company-dashboard/types'
import { cn } from '@/lib/cn'

/* design/user-dashboard panels.tsx `PerformanceOverview` (PRD §6.1): a divided card head with
   a muted Activity circle, then three rows — a 40px icon tile in the metric's hue, label and
   detail (170px wide from `sm`), and "Progress" with the percentage over a bar in the same
   hue. The rates are derived from the counts (derive.ts), never sent. */

type Hue = 'blue' | 'emerald' | 'violet'

const HUES: Record<Hue, { tile: string; text: string }> = {
  blue: { tile: 'bg-stat-blue-icon-bg text-stat-blue-icon', text: 'text-stat-blue-icon' },
  emerald: { tile: 'bg-stat-emerald-icon-bg text-stat-emerald-icon', text: 'text-stat-emerald-icon' },
  violet: { tile: 'bg-stat-violet-icon-bg text-stat-violet-icon', text: 'text-stat-violet-icon' },
}

export function PerformanceOverview({ performance, currency }: { performance: DashboardPerformance; currency: string }) {
  const t = useTranslations('companyDashboard.performance')
  const f = useCompanyDashboardFormat(currency)

  const rows: { key: string; hue: Hue; icon: LucideIcon; label: string; detail: string; value: number }[] = [
    {
      key: 'tasks',
      hue: 'blue',
      icon: Target,
      label: t('taskRate'),
      detail: t('taskRateDetail', { done: f.count(performance.tasksDone), total: f.count(performance.tasksTotal) }),
      value: taskCompletionRate(performance),
    },
    {
      key: 'invoices',
      hue: 'emerald',
      icon: FileText,
      label: t('invoiceRate'),
      detail: t('invoiceRateDetail', { paid: f.count(performance.invoicesPaid), total: f.count(performance.invoicesTotal) }),
      value: invoicePaymentRate(performance),
    },
    {
      key: 'profit',
      hue: 'violet',
      icon: TrendingUp,
      label: t('profitMargin'),
      detail: t('profitMarginDetail', { amount: f.money(netProfit(performance)) }),
      value: profitMargin(performance),
    },
  ]

  return (
    <Card className="flex h-full flex-col">
      <CardHeading
        divided
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Activity className="size-icon" strokeWidth={1.75} aria-hidden="true" />
          </span>
        }
      />
      <ul className="flex-1 divide-y divide-border">
        {rows.map((row) => (
          <li key={row.key} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-card py-4">
            <span className={cn('inline-flex size-10 shrink-0 items-center justify-center rounded-lg', HUES[row.hue].tile)}>
              <row.icon className="size-icon-lg" strokeWidth={1.75} aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1 sm:w-[170px] sm:flex-none">
              <p className="text-title-row">{row.label}</p>
              <p className="text-body-sm text-muted-foreground">{row.detail}</p>
            </div>
            <div className="w-full min-w-0 sm:w-auto sm:flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-caption font-normal text-muted-foreground">{t('progress')}</span>
                <span className={cn('text-body-sm font-medium', HUES[row.hue].text)}>{f.percent(row.value)}</span>
              </div>
              <ProgressBar value={row.value} tone={row.hue} label={row.label} className="mt-1.5" />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
