import * as React from 'react'
import { Tag, Gift, Settings2 } from 'lucide-react'

/* Implements design-system/components/HeroBanner.md */

const DOTS = [
  { left: '41%', top: '14%', size: 5, accent: true },
  { left: '73%', top: '9%', size: 5, accent: false },
  { left: '36%', top: '78%', size: 5, accent: false },
  { left: '88%', top: '70%', size: 5, accent: true },
  { left: '57%', top: '46%', size: 3, accent: false },
]

const SHORTCUTS = [
  { label: 'Coupons', icon: Tag },
  { label: 'Referral', icon: Gift },
  { label: 'Settings', icon: Settings2 },
]

export function HeroBanner() {
  return (
    <section className="relative overflow-hidden rounded-xl bg-hero px-5 py-4 text-hero-foreground sm:px-7">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(to top, var(--hero-glow-slate) 4%, transparent 20%),' +
            'radial-gradient(460px 58px at 14% 100%, var(--hero-glow-teal) 0%, transparent 78%),' +
            'radial-gradient(380px 52px at 88% 100%, var(--hero-glow-teal) 0%, transparent 78%),' +
            'linear-gradient(to left, var(--hero-glow-slate) -70%, transparent 16%)',
        }}
      />
      <div aria-hidden className="absolute inset-0">
        {DOTS.map((d, i) => (
          <span
            key={i}
            className={d.accent ? 'absolute rounded-full bg-hero-accent opacity-75' : 'absolute rounded-full bg-hero-foreground opacity-35'}
            style={{ left: d.left, top: d.top, width: d.size, height: d.size }}
          />
        ))}
      </div>

      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="text-body text-hero-muted">Good morning,</p>
          <p className="mt-0.5 flex items-center gap-2 text-display">
            Super Admin <span aria-hidden>👋</span>
          </p>
          <p className="mt-1.5 text-body-sm text-hero-muted">
            Here&rsquo;s what&rsquo;s happening across your platform today.
          </p>
          <p className="mt-3.5 flex items-center gap-2 text-body-sm font-medium text-hero-accent">
            <span aria-hidden className="inline-flex gap-1">
              <span className="block size-[5px] rounded-full bg-hero-accent" />
              <span className="block size-[5px] rounded-full bg-hero-accent opacity-60" />
              <span className="block size-[5px] rounded-full bg-hero-accent opacity-30" />
            </span>
            7 registered companies
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-14 min-w-[72px] flex-col items-center justify-center gap-0.5 rounded-lg border border-hero-chip-border bg-hero-chip px-3">
            <b className="text-[17px] leading-[22px] font-bold">7</b>
            <span className="text-[11px] leading-[14px] text-hero-muted">Companies</span>
          </div>
          <div className="flex h-14 min-w-[72px] flex-col items-center justify-center gap-0.5 rounded-lg border border-hero-chip-border bg-hero-chip px-3">
            <b className="text-[17px] leading-[22px] font-bold text-hero-accent">55%</b>
            <span className="text-[11px] leading-[14px] text-hero-muted">Growth</span>
          </div>
          {SHORTCUTS.map((s) => (
            <button
              key={s.label}
              className="flex h-14 w-[58px] flex-col items-center justify-center gap-1 rounded-lg text-hero-foreground transition-colors hover:bg-hero-chip focus-visible:shadow-focus focus-visible:outline-none max-sm:hidden"
            >
              <s.icon className="size-[18px]" strokeWidth={1.75} />
              <span className="text-[10px] leading-[12px] text-hero-muted">{s.label}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
