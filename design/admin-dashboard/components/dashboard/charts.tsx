'use client'

import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { Card, CardHeader, Badge } from '@/components/ui/primitives'
import { MONTHS, MONTH_NAMES, companiesByMonth, revenueByMonth, money } from '@/lib/dashboard-data'
import { cn } from '@/lib/cn'

/* Bars are chart-1 at --opacity-chart-fill (0.7). Written as /70 because Tailwind
   compiles a /(--var) opacity to color-mix(), which needs a percentage, not 0.7.
   Charts are built from the chart-* tokens the design system defines
   (chart-1, chart-grid, chart-cursor, chart-area-from/to). No chart library. */

function YearSelect({ value = '2026' }: { value?: string }) {
  return (
    <label className="relative inline-flex">
      <select
        defaultValue={value}
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

const PLOT_H = 270

export function CompaniesBarChart() {
  const [hovered, setHovered] = React.useState<number | null>(7) // Aug, as captured
  const max = 16
  const ticks = [16, 12, 8, 4, 0]
  const total = companiesByMonth.reduce((a, b) => a + b, 0)

  return (
    <Card>
      <CardHeader
        title="New Companies Registered"
        subtitle="Companies joined per month — 2026"
        action={
          <>
            <Badge tone="success">{total} total</Badge>
            <YearSelect />
          </>
        }
      />
      <div className="p-card pt-5">
        <div className="flex" style={{ height: PLOT_H }}>
          {/* y axis */}
          <div className="relative w-7 shrink-0">
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

          {/* plot */}
          <div className="relative flex-1 border-l border-chart-1/50">
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

            <div className="absolute inset-0 flex items-end pr-6.5" onMouseLeave={() => setHovered(7)}>
              {companiesByMonth.map((v, i) => (
                <div
                  key={MONTHS[i]}
                  onMouseEnter={() => setHovered(i)}
                  className="relative flex h-full flex-1 items-end justify-center"
                >
                  {hovered === i ? (
                    <span aria-hidden className="absolute inset-0 bg-chart-cursor" />
                  ) : null}
                  <span
                    className="relative block w-7 bg-chart-1/70 max-sm:w-3"
                    style={{ height: `${(v / max) * 100}%` }}
                  >
                    <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[11px] leading-none text-chart-1/70">
                      {v}
                    </span>
                  </span>

                  {hovered === i ? (
                    <div
                      className={cn(
                        'pointer-events-none absolute top-[58%] z-10 w-max rounded-lg border border-border bg-popover px-3 py-2 shadow-lg',
                        i >= 9 ? 'right-1/2 mr-3' : 'left-1/2 ml-3',
                      )}
                    >
                      <p className="text-[11px] leading-4 text-muted-foreground">
                        {MONTH_NAMES[i]} 2026
                      </p>
                      <p className="mt-0.5 text-body-sm text-foreground">Companies : {v}</p>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* x axis */}
        <div className="flex">
          <div className="w-7 shrink-0" />
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

/** monotone-ish cubic through the points, in a 0..1000 x 0..100 space */
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
  return { d, pts }
}

export function RevenueAreaChart() {
  const max = 14000
  const ticks = [14000, 10500, 7000, 3500, 0]
  const total = revenueByMonth.reduce((a, b) => a + b, 0)
  const { d } = smoothPath(revenueByMonth, max)

  return (
    <Card>
      <CardHeader
        title="Monthly Revenue"
        subtitle="Approved plan orders — 2026"
        action={
          <>
            <Badge tone="success" className="text-money h-6 font-medium">
              {money(total)}
            </Badge>
            <YearSelect />
          </>
        }
      />
      <div className="p-card pt-5">
        <div className="flex" style={{ height: PLOT_H }}>
          <div className="relative w-[57px] shrink-0">
            {ticks.map((t) => (
              <span
                key={t}
                className="absolute right-2 -translate-y-1/2 text-[11px] leading-none text-muted-foreground"
                style={{ top: `${((max - t) / max) * 100}%` }}
              >
                {money(t)}
              </span>
            ))}
          </div>

          <div className="relative flex-1 border-l border-chart-1/50">
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
            <div className="absolute inset-0 pr-6">
            <svg
              className="absolute inset-0 size-full overflow-visible"
              viewBox="0 0 1000 100"
              preserveAspectRatio="none"
              aria-hidden
            >
              <defs>
                <linearGradient id="task-revenue-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-area-from)" />
                  <stop offset="100%" stopColor="var(--chart-area-to)" />
                </linearGradient>
              </defs>
              <path d={`${d} L 1000 100 L 0 100 Z`} fill="url(#task-revenue-fill)" />
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
          <div className="w-[57px] shrink-0" />
          <div className="relative flex-1 pt-2.5 pr-6">
            {MONTHS.map((m, i) => (
              <span
                key={m}
                className={cn(
                  'absolute top-2.5 text-[11px] leading-4 text-muted-foreground',
                  i % 3 !== 0 && 'max-sm:invisible',
                  i === 0 && 'left-0',
                  i === MONTHS.length - 1 && 'right-0',
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
