import { cn } from '@/lib/cn'

/* design-system/components/ProgressRing.md — one figure against its own maximum. Two
   concentric circles: the `track` ring, then the value ring with a round cap, starting at
   twelve o'clock. The figure sits in the middle with an optional unit line under it.
   Sizes:
   - sm: 72px, `progress-ring` (4px) stroke, 16px/700 figure, 10px unit (ProgressRing.md)
   - md: 96px, 6px stroke, 22px/700 figure (ProgressRing.md)
   - xl: 144px, 17px stroke on a 150 viewBox, 30px/700 figure, `body-sm` unit — the
     Project Progress donut in design/user-dashboard (panels.tsx)
   Tone: `auto` follows the spec — `primary` under 75%, `warning` from 75%, `danger` from 90%
   — for consumption against a limit. A completion figure (more is better) passes
   `primary` so a nearly finished project never turns red. Never animates. */

const SIZES = {
  sm: { box: 72, r: 32, stroke: 'var(--progress-ring)', svg: 'size-18', figure: 'text-base leading-5 font-bold', unit: 'text-[10px] leading-3' },
  md: { box: 96, r: 45, stroke: 6, svg: 'size-24', figure: 'text-[22px] leading-7 font-bold', unit: 'text-[10px] leading-3' },
  xl: { box: 150, r: 62, stroke: 17, svg: 'size-36', figure: 'text-[30px] leading-9 font-bold tracking-[-0.02em]', unit: 'text-body-sm' },
} as const

function autoColor(pct: number) {
  if (pct >= 90) return 'var(--danger)'
  if (pct >= 75) return 'var(--warning)'
  return 'var(--primary)'
}

export function ProgressRing({
  value,
  label,
  figure,
  unit,
  size = 'sm',
  tone = 'auto',
  className,
}: {
  /** 0–100 */
  value: number
  /** Accessible name, e.g. "Enterprise Digital Transformation progress". */
  label: string
  /** Text in the middle; defaults to the rounded percentage ("33%"). */
  figure?: string
  /** Optional line under the figure ("complete", "GB"). */
  unit?: string
  size?: keyof typeof SIZES
  tone?: 'auto' | 'primary'
  className?: string
}) {
  const pct = Math.max(0, Math.min(100, value))
  const s = SIZES[size]
  const c = s.box / 2
  const circumference = 2 * Math.PI * s.r

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn('relative inline-flex shrink-0', className)}
    >
      <svg viewBox={`0 0 ${s.box} ${s.box}`} className={cn(s.svg, '-rotate-90')} aria-hidden="true">
        <circle cx={c} cy={c} r={s.r} fill="none" stroke="var(--track)" strokeWidth={s.stroke} />
        {/* a round cap would draw a dot at 0% */}
        {pct > 0 ? (
          <circle
            cx={c}
            cy={c}
            r={s.r}
            fill="none"
            stroke={tone === 'auto' ? autoColor(pct) : 'var(--primary)'}
            strokeWidth={s.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - pct / 100)}
          />
        ) : null}
      </svg>
      <span aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={s.figure}>{figure ?? `${Math.round(pct)}%`}</span>
        {unit ? <span className={cn(s.unit, 'text-muted-foreground')}>{unit}</span> : null}
      </span>
    </div>
  )
}
