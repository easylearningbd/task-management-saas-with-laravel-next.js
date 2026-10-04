import * as React from 'react'
import { cn } from '@/lib/cn'

/* design-system/components/HeroBanner.md, as built in design/admin-dashboard/components/
   dashboard/hero-banner.tsx: the only dark surface in the product — a `hero` card on
   `radius-xl` with glows in `hero-glow-teal`/`hero-glow-slate` anchored at the bottom edge
   and a scatter of small dots. Same ground in both themes. Children are the content. */

const DOTS = [
  { left: '41%', top: '14%', size: 5, accent: true },
  { left: '73%', top: '9%', size: 5, accent: false },
  { left: '36%', top: '78%', size: 5, accent: false },
  { left: '88%', top: '70%', size: 5, accent: true },
  { left: '57%', top: '46%', size: 3, accent: false },
] as const

const GLOWS =
  'linear-gradient(to top, var(--hero-glow-slate) 4%, transparent 20%),' +
  'radial-gradient(460px 58px at 14% 100%, var(--hero-glow-teal) 0%, transparent 78%),' +
  'radial-gradient(380px 52px at 88% 100%, var(--hero-glow-teal) 0%, transparent 78%),' +
  'linear-gradient(to left, var(--hero-glow-slate) -70%, transparent 16%)'

export function HeroBanner({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <section className={cn('relative overflow-hidden rounded-xl bg-hero px-5 py-4 text-hero-foreground sm:px-7', className)}>
      <div aria-hidden="true" className="absolute inset-0" style={{ background: GLOWS }} />
      <div aria-hidden="true" className="absolute inset-0">
        {DOTS.map((dot) => (
          <span
            key={`${dot.left}-${dot.top}`}
            className={cn(
              'absolute rounded-full',
              dot.accent ? 'bg-hero-accent opacity-75' : 'bg-hero-foreground opacity-35',
            )}
            style={{ left: dot.left, top: dot.top, width: dot.size, height: dot.size }}
          />
        ))}
      </div>
      <div className="relative">{children}</div>
    </section>
  )
}

/** A glassy figure chip on the hero: 17px/700 figure over an 11px `hero-muted` caption. */
export function HeroChip({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="flex h-14 min-w-[72px] flex-col items-center justify-center gap-0.5 rounded-lg border border-hero-chip-border bg-hero-chip px-3">
      <b className={cn('text-[17px] leading-[22px] font-bold', accent && 'text-hero-accent')}>{value}</b>
      <span className="text-[11px] leading-[14px] text-hero-muted">{label}</span>
    </div>
  )
}
