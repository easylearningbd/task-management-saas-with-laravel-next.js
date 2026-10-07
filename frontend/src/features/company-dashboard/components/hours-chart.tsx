'use client'

import * as React from 'react'
import { Inbox } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { BarChart } from '@/components/shared/charts/bar-chart'
import { ChartBodySkeleton, YearSelect } from '@/components/shared/charts/chart-parts'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeading } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { useCompanyDashboardCharts } from '@/features/company-dashboard/api'
import { useCompanyDashboardFormat } from '@/features/company-dashboard/format'
import { chartScale } from '@/features/company-dashboard/scale'

/* design/user-dashboard page.tsx `BarChartCard` "Timesheet Hours" (PRD §6.1): logged hours
   per month for the chosen year, "N h total" in an `info` badge, a year select; 24px bars
   with "42h" labels, a 32px tick gutter, hover band + "Hours : 42h" tooltip. A year with no
   hours shows a one-line empty state. */
export function HoursChart() {
  const t = useTranslations('companyDashboard.hoursChart')
  const [year, setYear] = React.useState(() => new Date().getFullYear())
  const { data, isPending } = useCompanyDashboardCharts(year)
  const f = useCompanyDashboardFormat(data?.currency ?? 'USD')

  const values = data?.hoursByMonth ?? []
  const total = values.reduce((sum, hours) => sum + hours, 0)
  const shownYear = data?.year ?? year
  const years = data ? Array.from(new Set([...data.years, year])).sort((a, b) => b - a) : [year]
  const hours = (value: number) => t('value', { hours: f.count(value) })

  return (
    <Card>
      <CardHeading
        title={t('title')}
        subtitle={t('subtitle', { year: shownYear })}
        action={
          <>
            {data && total > 0 ? <Badge tone="info">{t('total', { hours: f.count(total) })}</Badge> : null}
            <YearSelect years={years} value={year} onChange={setYear} />
          </>
        }
      />
      {isPending ? (
        <ChartBodySkeleton />
      ) : total === 0 ? (
        <EmptyState icon={Inbox} message={t('empty', { year: shownYear })} />
      ) : (
        <BarChart
          values={values}
          scale={chartScale(values)}
          formatTick={f.count}
          formatValue={hours}
          monthLabel={(m) => f.monthShort(shownYear, m)}
          monthName={(m) => f.monthYear(shownYear, m)}
          axisWidth="w-8"
          barWidth="w-6"
          caption={t('subtitle', { year: shownYear })}
          valueHeader={t('valueHeader')}
          tooltipLine={(value) => t('tooltip', { hours: f.count(value) })}
        />
      )}
    </Card>
  )
}
