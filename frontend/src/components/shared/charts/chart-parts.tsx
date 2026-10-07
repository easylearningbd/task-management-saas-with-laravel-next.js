'use client'

import { useTranslations } from 'next-intl'
import { NativeSelect } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/cn'

/* Pieces shared by the month charts — design/user-dashboard/components/charts/charts.tsx
   (and the same parts in design/admin-dashboard): built from the chart-* tokens, no chart
   library. Gridlines are `chart-1` at 30% (dashed) with a 70% baseline; the y-axis rule is
   50%; tick labels 11px `muted-foreground`. A chart's scale ({ max, ticks }) is the caller's:
   each design rounds its axis differently. */

/** Plot height from the designs (PLOT_H = 270). */
export const PLOT_HEIGHT = 'h-[270px]'

/** Month indexes 0–11. */
export const MONTHS = Array.from({ length: 12 }, (_, i) => i)

export type ChartScale = { max: number; ticks: number[] }

/** The chart header's year picker: `control-height-sm` select (design: YearSelect). */
export function YearSelect({ years, value, onChange }: { years: number[]; value: number; onChange: (year: number) => void }) {
  const t = useTranslations('shared.charts')
  return (
    <NativeSelect aria-label={t('year')} value={value} onChange={(event) => onChange(Number(event.target.value))}>
      {years.map((year) => (
        <option key={year} value={year}>
          {year}
        </option>
      ))}
    </NativeSelect>
  )
}

const tickTop = (tick: number, max: number) => `${((max - tick) / max) * 100}%`

/** Tick labels down the left edge; `width` is the design's gutter for that chart. */
export function YAxis({ scale, width, format }: { scale: ChartScale; width: string; format: (tick: number) => string }) {
  return (
    <div aria-hidden="true" className={cn('relative shrink-0', width)}>
      {scale.ticks.map((tick) => (
        <span
          key={tick}
          className="absolute right-2 -translate-y-1/2 text-[11px] leading-none whitespace-nowrap text-muted-foreground"
          style={{ top: tickTop(tick, scale.max) }}
        >
          {format(tick)}
        </span>
      ))}
    </div>
  )
}

export function GridLines({ scale }: { scale: ChartScale }) {
  return (
    <>
      {scale.ticks.map((tick) => (
        <span
          key={tick}
          aria-hidden="true"
          className={cn('absolute inset-x-0 border-t', tick === 0 ? 'border-chart-1/70' : 'border-dashed border-chart-1/30')}
          style={{ top: tickTop(tick, scale.max) }}
        />
      ))}
    </>
  )
}

/** The figures as a table for screen readers — the drawn chart is aria-hidden. */
export function ChartDataTable({
  caption,
  valueHeader,
  rows,
}: {
  caption: string
  valueHeader: string
  rows: { label: string; value: string }[]
}) {
  const t = useTranslations('shared.charts')
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          <th scope="col">{t('month')}</th>
          <th scope="col">{valueHeader}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label}>
            <th scope="row">{row.label}</th>
            <td>{row.value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/** Stand-in for a chart body while its year loads: plot area + axis row. */
export function ChartBodySkeleton() {
  return (
    <div aria-hidden="true" className="p-card pt-5">
      <Skeleton className={cn(PLOT_HEIGHT, 'w-full rounded-lg')} />
      <Skeleton className="mt-2.5 h-4 w-full" />
    </div>
  )
}
