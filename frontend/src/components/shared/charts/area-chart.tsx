'use client'

import * as React from 'react'
import { ChartDataTable, GridLines, MONTHS, PLOT_HEIGHT, YAxis, type ChartScale } from '@/components/shared/charts/chart-parts'
import { cn } from '@/lib/cn'

/* design/user-dashboard/components/charts/charts.tsx — AreaChartCard's body: a 2px `chart-1`
   line (smoothed) over an area fading `chart-area-from` → `chart-area-to`, ticks on the left,
   twelve month labels under it (below `sm` only every third one). The card and its head are
   the caller's (Card + CardHeading). */

/** Smooth cubic through the points in a 0..1000 × 0..100 space (from the design). */
function smoothPath(values: readonly number[], max: number) {
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

export function AreaChart({
  values,
  scale,
  formatTick,
  formatValue,
  monthLabel,
  monthName,
  axisWidth = 'w-[62px]',
  caption,
  valueHeader,
}: {
  /** Twelve monthly values, January first. */
  values: readonly number[]
  scale: ChartScale
  formatTick: (tick: number) => string
  /** A value in the screen-reader table. */
  formatValue: (value: number) => string
  /** "Jan" */
  monthLabel: (month: number) => string
  /** "January 2026" — the screen-reader table's row header. */
  monthName: (month: number) => string
  /** The tick gutter (design: 62px for money). */
  axisWidth?: string
  /** Screen-reader table caption and value column header. */
  caption: string
  valueHeader: string
}) {
  const gradientId = `area-fill-${React.useId().replace(/[^a-zA-Z0-9_-]/g, '')}`
  const line = smoothPath(values, scale.max)

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
          <div className="absolute inset-0 pr-6">
            <svg className="absolute inset-0 size-full overflow-visible" viewBox="0 0 1000 100" preserveAspectRatio="none">
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-area-from)" />
                  <stop offset="100%" stopColor="var(--chart-area-to)" />
                </linearGradient>
              </defs>
              <path d={`${line} L 1000 100 L 0 100 Z`} fill={`url(#${gradientId})`} />
              <path
                d={line}
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
        <div className={cn('shrink-0', axisWidth)} />
        <div className="relative flex-1 pt-2.5 pr-6">
          {MONTHS.map((m) => (
            <span
              key={m}
              className={cn(
                'absolute top-2.5 text-[11px] leading-4 text-muted-foreground',
                m % 3 !== 0 && 'max-sm:invisible',
                m === 0 && 'left-0',
                m === 11 && 'right-6',
                m > 0 && m < 11 && '-translate-x-1/2',
              )}
              style={m > 0 && m < 11 ? { left: `${(m / 11) * 100}%` } : undefined}
            >
              {monthLabel(m)}
            </span>
          ))}
          <span className="block h-4" />
        </div>
      </div>
    </div>
  )
}
