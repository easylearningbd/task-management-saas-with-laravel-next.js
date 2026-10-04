'use client'

import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { Card, Badge } from '@/components/ui/primitives'
import { cn } from '@/lib/cn'
import { MONTHS, MONTH_NAMES } from '@/lib/company-data'

/* Generic chart cards built from the chart-* tokens: chart-1 for the series,
   chart-1 at 30/50/70% for gridlines, axes and bars, chart-cursor for the hover band.
   Bars are chart-1 at --opacity-chart-fill (0.7), written /70 because Tailwind
   compiles a /(--var) opacity to color-mix(), which needs a percentage. */

const PLOT_H = 270

function YearSelect() {
  return (
    <label className="relative inline-flex">
      <select
        defaultValue="2026"
        className="h-control-sm appearance-none rounded-lg border border-input bg-card pr-8 pl-3 text-button-sm font-medium text-foreground shadow-sm focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none"
      >
        <option>2026</option>
        <option>2025</option>
        <option>2024</option>
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
    </label>
  )
}

function ChartHead({
  title, subtitle, badge, badgeTone = 'success',
}: {
  title: string
  subtitle: string
  badge: string
  badgeTone?: 'success' | 'info'
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2 p-card pb-0">
      <div className="min-w-0">
        <h2 className="text-title-card">{title}</h2>
        <p className="text-caption font-normal text-muted-foreground">{subtitle}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Badge tone={badgeTone}>{badge}</Badge>
        <YearSelect />
      </div>
    </div>
  )
}

function Gridlines({ ticks, max }: { ticks: number[]; max: number }) {
  return (
    <>
      {ticks.map((t) => (
        <span
          key={t}
          aria-hidden
          className={cn(
            'absolute inset-x-0 border-t',
            t === 0 ? 'border-chart-1/70' : 'border-dashed border-chart-1/30',
          )}
          style={{ top: `${((max - t) / max) * 100}%` }}
        />
      ))}
    </>
  )
}

/* -------------------------------------------------------------- Bar chart */

export function BarChartCard({
  title, subtitle, badge, badgeTone, values, max, ticks, suffix = '', unit = '',
}: {
  title: string
  subtitle: string
  badge: string
  badgeTone?: 'success' | 'info'
  values: number[]
  max: number
  ticks: number[]
  /** appended to each bar's value label, e.g. "h" */
  suffix?: string
  /** noun used in the tooltip, e.g. "Hours" */
  unit?: string
}) {
  const [hovered, setHovered] = React.useState<number | null>(null)
  return (
    <Card>
      <ChartHead title={title} subtitle={subtitle} badge={badge} badgeTone={badgeTone} />
      <div className="p-card pt-5">
        <div className="flex" style={{ height: PLOT_H }}>
          <div className="relative w-8 shrink-0">
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute right-2 -translate-y-1/2 text-[11px] leading-none text-muted-foreground"
                style={{ top: `${((max - t) / max) * 100}%` }}
              >
                {t}
              </span>
            ))}
          </div>

          <div className="relative flex-1 border-l border-chart-1/50">
            <Gridlines ticks={ticks} max={max} />
            <div className="absolute inset-0 flex items-end pr-6.5" onMouseLeave={() => setHovered(null)}>
              {values.map((v, i) => (
                <div
                  key={MONTHS[i]}
                  onMouseEnter={() => setHovered(i)}
                  className="relative flex h-full flex-1 items-end justify-center"
                >
                  {hovered === i ? <span aria-hidden className="absolute inset-0 bg-chart-cursor" /> : null}
                  <span
                    className="relative block w-6 bg-chart-1/70 max-sm:w-3"
                    style={{ height: `${(v / max) * 100}%` }}
                  >
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[11px] leading-none text-chart-1/70">
                      {v}
                      {suffix}
                    </span>
                  </span>
                  {hovered === i ? (
                    <div
                      className={cn(
                        'pointer-events-none absolute top-[58%] z-10 w-max rounded-lg border border-border bg-popover px-3 py-2 shadow-lg',
                        i >= 9 ? 'right-1/2 mr-3' : 'left-1/2 ml-3',
                      )}
                    >
                      <p className="text-[11px] leading-4 text-muted-foreground">{MONTH_NAMES[i]} 2026</p>
                      <p className="mt-0.5 text-body-sm text-foreground">
                        {unit} : {v}
                        {suffix}
                      </p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex">
          <div className="w-8 shrink-0" />
          <div className="flex flex-1 pt-2.5 pr-6.5">
            {MONTHS.map((m, i) => (
              <span
                key={m}
                className={cn(
                  'flex-1 text-center text-[11px] leading-4 text-muted-foreground',
                  i % 3 !== 0 && 'max-sm:invisible',
                )}
              >
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </Card>
  )
}

/* ------------------------------------------------------------- Area chart */

function smoothPath(values: number[], max: number) {
  const n = values.length
  const pts = values.map((v, i) => [(i / (n - 1)) * 1000, 100 - (v / max) * 100] as const)
  let d = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[Math.max(0, i - 1)]
    const [x1, y1] = pts[i]
    const [x2, y2] = pts[i + 1]
    const [x3, y3] = pts[Math.min(n - 1, i + 2)]
    const c1x = x1 + (x2 - x0) / 6, c1y = y1 + (y2 - y0) / 6
    const c2x = x2 - (x3 - x1) / 6, c2y = y2 - (y3 - y1) / 6
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${x2} ${y2}`
  }
  return d
}

export function AreaChartCard({
  title, subtitle, badge, badgeTone, values, max, ticks, format, gradientId = 'task-area-fill',
}: {
  title: string
  subtitle: string
  badge: string
  badgeTone?: 'success' | 'info'
  values: number[]
  max: number
  ticks: number[]
  format: (n: number) => string
  gradientId?: string
}) {
  const d = smoothPath(values, max)
  return (
    <Card>
      <ChartHead title={title} subtitle={subtitle} badge={badge} badgeTone={badgeTone} />
      <div className="p-card pt-5">
        <div className="flex" style={{ height: PLOT_H }}>
          <div className="relative w-[62px] shrink-0">
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute right-2 -translate-y-1/2 text-[11px] leading-none text-muted-foreground"
                style={{ top: `${((max - t) / max) * 100}%` }}
              >
                {format(t)}
              </span>
            ))}
          </div>

          <div className="relative flex-1 border-l border-chart-1/50">
            <Gridlines ticks={ticks} max={max} />
            <div className="absolute inset-0 pr-6">
              <svg
                className="absolute inset-0 size-full overflow-visible"
                viewBox="0 0 1000 100"
                preserveAspectRatio="none"
                aria-hidden
              >
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-area-from)" />
                    <stop offset="100%" stopColor="var(--chart-area-to)" />
                  </linearGradient>
                </defs>
                <path d={`${d} L 1000 100 L 0 100 Z`} fill={`url(#${gradientId})`} />
                <path
                  d={d}
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

        <div className="flex">
          <div className="w-[62px] shrink-0" />
          <div className="relative flex-1 pt-2.5 pr-6">
            {MONTHS.map((m, i) => (
              <span
                key={m}
                className={cn(
                  'absolute top-2.5 text-[11px] leading-4 text-muted-foreground',
                  i % 3 !== 0 && 'max-sm:invisible',
                  i === 0 && 'left-0',
                  i === MONTHS.length - 1 && 'right-6',
                  i > 0 && i < MONTHS.length - 1 && '-translate-x-1/2',
                )}
                style={i > 0 && i < MONTHS.length - 1 ? { left: `${(i / (MONTHS.length - 1)) * 100}%` } : undefined}
              >
                {m}
              </span>
            ))}
            <span className="block h-4" />
          </div>
        </div>
      </div>
    </Card>
  )
}
