'use client'

import * as React from 'react'
import { Inbox } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeading } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { useAdminDashboardCharts } from '@/features/admin-dashboard/api'
import { useDashboardFormat } from '@/features/admin-dashboard/format'
import { niceScale } from '@/features/admin-dashboard/scale'
import {
  ChartBodySkeleton,
  ChartDataTable,
  GridLines,
  PLOT_HEIGHT,
  YAxis,
  YearSelect,
} from '@/features/admin-dashboard/components/chart-parts'
import { cn } from '@/lib/cn'

const MONTHS = Array.from({ length: 12 }, (_, i) => i)

/** Monotone-ish cubic through the points in a 0..1000 × 0..100 space (from the design). */
function smoothPath(values: number[], max: number) {
  const n = values.length
  const pts = values.map((v, i) => [(i / (n - 1)) * 1000, 100 - (v / max) * 100] as const)
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[Math.max(0, i - 1)]
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[i + 1]
    const [x3, y3] = pts[Math.min(n - 1, i + 2)]
    const c1x = x1 + (x2 - x0) / 6
    const c1y = y1 + (y2 - y0) / 6
    const c2x = x2 - (x3 - x1) / 6
    const c2y = y2 - (y3 - y1) / 6
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`
  }
  return d
}

/* design/admin-dashboard/components/dashboard/charts.tsx — RevenueAreaChart: a 2px `chart-1`
   line over an area fading `chart-area-from` → `chart-area-to`, money ticks on the left.
   Below `sm` only every third month is labelled. */
export function RevenueChart({ years, currency }: { years: number[]; currency: string }) {
  const t = useTranslations('adminDashboard')
  const f = useDashboardFormat(currency)
  const [year, setYear] = React.useState(years[0])
  const { data, isPending } = useAdminDashboardCharts(year)
  const gradientId = `revenue-fill-${React.useId().replace(/[^a-zA-Z0-9_-]/g, '')}`

  const values = data?.revenueByMonth ?? []
  const total = values.reduce((sum, value) => sum + value, 0)
  const { max, ticks } = niceScale(values)
  const shownYear = data?.year ?? year
  const money = (value: number) => f.money(value)

  return (
    <Card>
      <CardHeading
        title={t('revenueChart.title')}
        subtitle={t('revenueChart.subtitle', { year: shownYear })}
        action={
          <>
            {data ? (
              <Badge tone="success" className="h-6 text-money font-medium">
                {money(total)}
              </Badge>
            ) : null}
            <YearSelect years={years} value={year} onChange={setYear} />
          </>
        }
      />

      {isPending ? (
        <ChartBodySkeleton />
      ) : total === 0 ? (
        <EmptyState
          icon={Inbox}
          title={t('revenueChart.emptyTitle', { year: shownYear })}
          description={t('revenueChart.emptyDescription')}
        />
      ) : (
        <div className="p-card pt-5">
          <ChartDataTable
            caption={t('revenueChart.subtitle', { year: shownYear })}
            valueHeader={t('chartTable.revenue')}
            rows={MONTHS.map((m) => ({ label: f.monthYear(shownYear, m), value: money(values[m]) }))}
          />
          <div aria-hidden="true" className={cn('flex', PLOT_HEIGHT)}>
            <YAxis ticks={ticks} max={max} width="w-[57px]" format={money} />
            <div className="relative flex-1 border-l border-chart-1/50">
              <GridLines ticks={ticks} max={max} />
              <div className="absolute inset-0 pr-6">
                <svg className="absolute inset-0 size-full overflow-visible" viewBox="0 0 1000 100" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--chart-area-from)" />
                      <stop offset="100%" stopColor="var(--chart-area-to)" />
                    </linearGradient>
                  </defs>
                  <path d={`${smoothPath(values, max)} L 1000 100 L 0 100 Z`} fill={`url(#${gradientId})`} />
                  <path
                    d={smoothPath(values, max)}
                    fill="none"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div aria-hidden="true" className="flex">
            <div className="w-[57px] shrink-0" />
            <div className="relative flex-1 pt-2.5 pr-6">
              {MONTHS.map((m) => (
                <span
                  key={m}
                  className={cn(
                    'absolute top-2.5 text-[11px] leading-4 text-muted-foreground',
                    m % 3 !== 0 && 'max-sm:invisible',
                    m === 0 && 'left-0',
                    m === 11 && 'right-0',
                    m > 0 && m < 11 && '-translate-x-1/2',
                  )}
                  style={m > 0 && m < 11 ? { left: `${(m / 11) * 100}%` } : undefined}
                >
                  {f.monthShort(shownYear, m)}
                </span>
              ))}
              <span className="block h-4" />
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
