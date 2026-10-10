import * as React from 'react'
import { cn } from '@/lib/cn'

/* A donut of parts of one whole (Budget Analysis: Spent / Remaining). No donut exists in the
   design system; it is built from ProgressRing's parts — the xl ring of design/user-dashboard
   (panels.tsx, Project Progress): a 150 viewBox, 62px radius and 17px stroke over the `track`
   circle, drawn from twelve o'clock, shown at 144px. Segments are butt-ended arcs laid end to
   end, each in a theme token (the chart series `chart-1` … `chart-5`, or a status colour when
   the part means something — `danger` for money spent); never a hex. All-zero values leave the
   bare track. An optional legend (Card.md's body text): a 10px dot in the segment's colour, the
   label, then the caller's figures right-aligned.
   The drawing is aria-hidden; the figure has role="img" with the caller's summary as its name,
   and the legend lists every value as text. Never animates. */

export type DonutColor = 'chart-1' | 'chart-2' | 'chart-3' | 'chart-4' | 'chart-5' | 'danger' | 'info' | 'success' | 'warning'

export type DonutSegment = {
  id: string
  label: string
  /** Geometry only — any unit, ≥ 0. */
  value: number
  color: DonutColor
  /** Legend figures, already formatted (e.g. "$6,221.00 (1%)"). */
  detail?: string
}

const BOX = 150
const R = 62
const STROKE = 17
const CIRCUMFERENCE = 2 * Math.PI * R

export const donutColor = (color: DonutColor) => `var(--${color})`

export function DonutChart({
  segments,
  label,
  center,
  legend = true,
  className,
}: {
  segments: ReadonlyArray<DonutSegment>
  /** Accessible summary, e.g. "Budget: $6,221.00 spent, $843,779.00 remaining". */
  label: string
  /** Optional content in the hole (a figure, a unit line). */
  center?: React.ReactNode
  legend?: boolean
  className?: string
}) {
  const total = segments.reduce((sum, segment) => sum + Math.max(0, segment.value), 0)
  let offset = 0
  const arcs = total > 0
    ? segments.map((segment) => {
        const length = (Math.max(0, segment.value) / total) * CIRCUMFERENCE
        const arc = { segment, length, offset }
        offset += length
        return arc
      })
    : []

  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-5', className)}>
      <div role="img" aria-label={label} className="relative shrink-0">
        <svg viewBox={`0 0 ${BOX} ${BOX}`} className="size-36 -rotate-90" aria-hidden="true">
          <circle cx={BOX / 2} cy={BOX / 2} r={R} fill="none" stroke="var(--track)" strokeWidth={STROKE} />
          {arcs.map(({ segment, length, offset: start }) =>
            length > 0 ? (
              <circle
                key={segment.id}
                cx={BOX / 2}
                cy={BOX / 2}
                r={R}
                fill="none"
                stroke={donutColor(segment.color)}
                strokeWidth={STROKE}
                strokeDasharray={`${length} ${CIRCUMFERENCE - length}`}
                strokeDashoffset={-start}
              />
            ) : null,
          )}
        </svg>
        {center ? (
          <span aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center">
            {center}
          </span>
        ) : null}
      </div>

      {legend ? (
        <ul className="flex min-w-0 flex-1 basis-40 flex-col gap-3">
          {segments.map((segment) => (
            <li key={segment.id} className="flex items-center gap-2 text-body">
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: donutColor(segment.color) }}
              />
              <span className="min-w-0 truncate text-muted-foreground">{segment.label}</span>
              {segment.detail ? <span className="ml-auto font-mono text-money whitespace-nowrap">{segment.detail}</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  )
}
