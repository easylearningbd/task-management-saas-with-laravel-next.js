'use client'

import * as React from 'react'
import { Inbox } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { AreaChart } from '@/components/shared/charts/area-chart'
import { ChartBodySkeleton, YearSelect } from '@/components/shared/charts/chart-parts'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeading } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { useCompanyDashboardCharts } from '@/features/company-dashboard/api'
import { sumMoney } from '@/features/company-dashboard/derive'
import { useCompanyDashboardFormat } from '@/features/company-dashboard/format'
import { chartScale } from '@/features/company-dashboard/scale'

/* design/user-dashboard page.tsx `AreaChartCard` "Monthly Revenue" (PRD §6.1): paid invoice
   revenue per month for the chosen year, the year's total in a `success` badge, a year
   select; money ticks in a 62px gutter. A year with no paid revenue shows a one-line empty
   state (the design only draws a year with data). */
export function RevenueChart() {
  const t = useTranslations('companyDashboard.revenueChart')
  const [year, setYear] = React.useState(() => new Date().getFullYear())
  const { data, isPending } = useCompanyDashboardCharts(year)
  const f = useCompanyDashboardFormat(data?.currency ?? 'USD')

  const values = data?.revenueByMonth ?? []
  const total = sumMoney(values)
  const shownYear = data?.year ?? year
  const years = data ? Array.from(new Set([...data.years, year])).sort((a, b) => b - a) : [year]

  return (
    <Card>
      <CardHeading
        title={t('title')}
        subtitle={t('subtitle', { year: shownYear })}
        action={
          <>
            {data && total > 0 ? <Badge tone="success">{f.money(total)}</Badge> : null}
            <YearSelect years={years} value={year} onChange={setYear} />
          </>
        }
      />
      {isPending ? (
        <ChartBodySkeleton />
      ) : total === 0 ? (
        <EmptyState icon={Inbox} message={t('empty', { year: shownYear })} />
      ) : (
        <AreaChart
          values={values}
          scale={chartScale(values)}
          formatTick={f.money}
          formatValue={f.money}
          monthLabel={(m) => f.monthShort(shownYear, m)}
          monthName={(m) => f.monthYear(shownYear, m)}
          axisWidth="w-[62px]"
          caption={t('subtitle', { year: shownYear })}
          valueHeader={t('valueHeader')}
        />
      )}
    </Card>
  )
}
