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

/* design/admin-dashboard/components/dashboard/charts.tsx — CompaniesBarChart.
   Bars `chart-1` at 70%; hovering a month lays a `chart-cursor` band behind it and opens a
   `popover` tooltip (flipping left for Oct–Dec). Below `sm` bars narrow to 12px and only
   every third month is labelled. */
export function CompaniesChart({ years, currency }: { years: number[]; currency: string }) {
  const t = useTranslations('adminDashboard')
  const f = useDashboardFormat(currency)
  const [year, setYear] = React.useState(years[0])
  const [hovered, setHovered] = React.useState<number | null>(null)
  const { data, isPending } = useAdminDashboardCharts(year)

  const values = data?.companiesByMonth ?? []
  const total = values.reduce((sum, value) => sum + value, 0)
  const { max, ticks } = niceScale(values, { integer: true })
  const shownYear = data?.year ?? year

  return (
    <Card>
      <CardHeading
        title={t('companiesChart.title')}
        subtitle={t('companiesChart.subtitle', { year: shownYear })}
        action={
          <>
            {data ? <Badge tone="success">{t('companiesChart.total', { count: f.count(total) })}</Badge> : null}
            <YearSelect years={years} value={year} onChange={setYear} />
          </>
        }
      />

      {isPending ? (
        <ChartBodySkeleton />
      ) : total === 0 ? (
        <EmptyState
          icon={Inbox}
          title={t('companiesChart.emptyTitle', { year: shownYear })}
          description={t('companiesChart.emptyDescription')}
        />
      ) : (
        <div className="p-card pt-5">
          <ChartDataTable
            caption={t('companiesChart.subtitle', { year: shownYear })}
            valueHeader={t('chartTable.companies')}
            rows={MONTHS.map((m) => ({ label: f.monthYear(shownYear, m), value: f.count(values[m]) }))}
          />
          <div aria-hidden="true" className={cn('flex', PLOT_HEIGHT)}>
            <YAxis ticks={ticks} max={max} width="w-7" format={f.count} />
            <div className="relative flex-1 border-l border-chart-1/50">
              <GridLines ticks={ticks} max={max} />
              <div className="absolute inset-0 flex items-end pr-6.5" onMouseLeave={() => setHovered(null)}>
                {MONTHS.map((m) => (
                  <div
                    key={m}
                    onMouseEnter={() => setHovered(m)}
                    className="relative flex h-full flex-1 items-end justify-center"
                  >
                    {hovered === m ? <span className="absolute inset-0 bg-chart-cursor" /> : null}
                    <span
                      className="relative block w-7 bg-chart-1/70 max-sm:w-3"
                      style={{ height: `${(values[m] / max) * 100}%` }}
                    >
                      <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[11px] leading-none text-chart-1/70">
                        {f.count(values[m])}
                      </span>
                    </span>

                    {hovered === m ? (
                      <div
                        className={cn(
                          'pointer-events-none absolute top-[58%] z-10 w-max rounded-lg border border-border bg-popover px-3 py-2 shadow-lg',
                          m >= 9 ? 'right-1/2 mr-3' : 'left-1/2 ml-3',
                        )}
                      >
                        <p className="text-[11px] leading-4 text-muted-foreground">{f.monthYear(shownYear, m)}</p>
                        <p className="mt-0.5 text-body-sm text-foreground">
                          {t('companiesChart.tooltip', { count: f.count(values[m]) })}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div aria-hidden="true" className="flex">
            <div className="w-7 shrink-0" />
            <div className="flex flex-1 pt-2.5 pr-6.5">
              {MONTHS.map((m) => (
                <span
                  key={m}
                  className={cn('flex-1 text-center text-[11px] leading-4 text-muted-foreground', m % 3 !== 0 && 'max-sm:invisible')}
                >
                  {f.monthShort(shownYear, m)}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
