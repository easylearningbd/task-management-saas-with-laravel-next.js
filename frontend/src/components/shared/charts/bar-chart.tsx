'use client'

import * as React from 'react'
import { ChartDataTable, GridLines, MONTHS, PLOT_HEIGHT, YAxis, type ChartScale } from '@/components/shared/charts/chart-parts'
import { cn } from '@/lib/cn'

/* design/user-dashboard/components/charts/charts.tsx — BarChartCard's body: one bar per
   month in `chart-1` at 70% with its value above it; hovering a month lays a `chart-cursor`
   band behind it and opens a `popover` tooltip (flipping left for Oct–Dec). Below `sm` the
   bars narrow to 12px and only every third month is labelled. The card and its head are the
   caller's. Hover is a pointer nicety only — the figures are in the screen-reader table. */

export function BarChart({
  values,
  scale,
  formatTick,
  formatValue,
  monthLabel,
  monthName,
  axisWidth = 'w-8',
  barWidth = 'w-6',
  caption,
  valueHeader,
  tooltipLine,
}: {
  /** Twelve monthly values, January first. */
  values: readonly number[]
  scale: ChartScale
  formatTick: (tick: number) => string
  /** The label above a bar and in the screen-reader table ("42h"). */
  formatValue: (value: number) => string
  /** "Jan" */
  monthLabel: (month: number) => string
  /** "January 2026" — tooltip heading and screen-reader row header. */
  monthName: (month: number) => string
  /** Tick gutter (design: 32px). */
  axisWidth?: string
  /** Bar width from `sm` up (design: 24px). */
  barWidth?: string
  caption: string
  valueHeader: string
  /** The tooltip's second line ("Hours : 42h"). */
  tooltipLine: (value: number) => string
}) {
  const [hovered, setHovered] = React.useState<number | null>(null)

  return (
    <div className="p-card pt-5">
      <ChartDataTable
        caption={caption}
        valueHeader={valueHeader}
        rows={MONTHS.map((m) => ({ label: monthName(m), value: formatValue(values[m] ?? 0) }))}
      />
      <div aria-hidden="true" className={cn('flex', PLOT_HEIGHT)}>
        <YAxis scale={scale} width={axisWidth} format={formatTick} />
        <div className="relative flex-1 border-l border-chart-1/50">
          <GridLines scale={scale} />
          <div className="absolute inset-0 flex items-end pr-6.5" onMouseLeave={() => setHovered(null)}>
            {MONTHS.map((m) => {
              const value = values[m] ?? 0
              return (
                <div key={m} onMouseEnter={() => setHovered(m)} className="relative flex h-full flex-1 items-end justify-center">
                  {hovered === m ? <span className="absolute inset-0 bg-chart-cursor" /> : null}
                  <span
                    className={cn('relative block bg-chart-1/70 max-sm:w-3', barWidth)}
                    style={{ height: `${(value / scale.max) * 100}%` }}
                  >
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[11px] leading-none whitespace-nowrap text-chart-1/70">
                      {formatValue(value)}
                    </span>
                  </span>
                  {hovered === m ? (
                    <div
                      className={cn(
                        'pointer-events-none absolute top-[58%] z-10 w-max rounded-lg border border-border bg-popover px-3 py-2 shadow-lg',
                        m >= 9 ? 'right-1/2 mr-3' : 'left-1/2 ml-3',
                      )}
                    >
                      <p className="text-[11px] leading-4 text-muted-foreground">{monthName(m)}</p>
                      <p className="mt-0.5 text-body-sm text-foreground">{tooltipLine(value)}</p>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div aria-hidden="true" className="flex">
        <div className={cn('shrink-0', axisWidth)} />
        {/* min-w-0 (row and labels): twelve labels at their natural width are wider than a phone-width plot */}
        <div className="flex min-w-0 flex-1 pt-2.5 pr-6.5">
          {MONTHS.map((m) => (
            <span
              key={m}
              className={cn('min-w-0 flex-1 text-center text-[11px] leading-4 text-muted-foreground', m % 3 !== 0 && 'max-sm:invisible')}
            >
              {monthLabel(m)}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
