'use client'

import * as React from 'react'
import {
  Briefcase, SquareCheck, Banknote, UserPlus,
  FolderOpen, Users, DollarSign, TrendingUp, ArrowUpRight,
} from 'lucide-react'
import { cn } from '@/lib/cn'

/* Company hero — same part as design-system/components/HeroBanner.md, company copy. */

const DOTS = [
  { left: '38%', top: '14%', size: 5, accent: false },
  { left: '72%', top: '10%', size: 5, accent: true },
  { left: '28%', top: '82%', size: 5, accent: false },
  { left: '66%', top: '86%', size: 5, accent: false },
  { left: '55%', top: '48%', size: 3, accent: false },
]

const SHORTCUTS = [
  { label: 'Projects', icon: Briefcase },
  { label: 'Tasks', icon: SquareCheck },
  { label: 'Invoices', icon: Banknote },
  { label: 'Clients', icon: UserPlus },
]

export function CompanyHero() {
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
          <p className="text-body text-hero-muted">Good evening,</p>
          <p className="mt-0.5 flex items-center gap-2 text-display">
            Company <span aria-hidden>👋</span>
          </p>
          <p className="mt-1.5 text-body-sm text-hero-muted">
            Here&rsquo;s what&rsquo;s happening across your company today.
          </p>
          <p className="mt-3.5 flex items-center gap-2 text-body-sm font-medium text-hero-accent">
            <span aria-hidden className="inline-flex gap-1">
              <span className="block size-[5px] rounded-full bg-hero-accent" />
              <span className="block size-[5px] rounded-full bg-hero-accent opacity-60" />
              <span className="block size-[5px] rounded-full bg-hero-accent opacity-30" />
            </span>
            12 active projects
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-14 min-w-[72px] flex-col items-center justify-center gap-0.5 rounded-lg border border-hero-chip-border bg-hero-chip px-3">
            <b className="text-[17px] leading-[22px] font-bold">12</b>
            <span className="text-[11px] leading-[14px] text-hero-muted">Projects</span>
          </div>
          <div className="flex h-14 min-w-[72px] flex-col items-center justify-center gap-0.5 rounded-lg border border-hero-chip-border bg-hero-chip px-3">
            <b className="text-[17px] leading-[22px] font-bold text-hero-accent">51.9%</b>
            <span className="text-[11px] leading-[14px] text-hero-muted">Tasks Done</span>
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

/* Company stat cards — design-system/components/StatCard.md at the compact 123px height. */

type Hue = 'blue' | 'violet' | 'indigo' | 'emerald'

const HUE: Record<Hue, { card: string; tile: string; icon: string; label: string; value: string; circle: string; border: string }> = {
  blue:    { card: 'bg-stat-blue',    tile: 'bg-stat-blue-icon-bg',    icon: 'text-stat-blue-icon',    label: 'text-stat-blue-label',    value: 'text-stat-blue-value',    circle: 'text-stat-blue-icon-bg',    border: 'border-stat-blue-icon-bg' },
  violet:  { card: 'bg-stat-violet',  tile: 'bg-stat-violet-icon-bg',  icon: 'text-stat-violet-icon',  label: 'text-stat-violet-label',  value: 'text-stat-violet-value',  circle: 'text-stat-violet-icon-bg',  border: 'border-stat-violet-icon-bg' },
  indigo:  { card: 'bg-stat-indigo',  tile: 'bg-stat-indigo-icon-bg',  icon: 'text-stat-indigo-icon',  label: 'text-stat-indigo-label',  value: 'text-stat-indigo-value',  circle: 'text-stat-indigo-icon-bg',  border: 'border-stat-indigo-icon-bg' },
  emerald: { card: 'bg-stat-emerald', tile: 'bg-stat-emerald-icon-bg', icon: 'text-stat-emerald-icon', label: 'text-stat-emerald-label', value: 'text-stat-emerald-value', circle: 'text-stat-emerald-icon-bg', border: 'border-stat-emerald-icon-bg' },
}

function StatCard({
  hue, icon: Icon, label, value, caption, trend,
}: {
  hue: Hue
  icon: React.ElementType
  label: string
  value: string
  caption: React.ReactNode
  trend?: boolean
}) {
  const h = HUE[hue]
  return (
    <div className={cn('relative h-[123px] overflow-hidden rounded-xl border p-4 shadow-xs', h.card, h.circle, h.border)}>
      <span aria-hidden className="absolute -top-5 -right-5 size-[76px] rounded-full bg-current opacity-55" />
      <span aria-hidden className="absolute -bottom-3.5 right-5 size-9 rounded-full bg-current opacity-45" />
      <span className={cn('relative inline-flex size-8 items-center justify-center rounded-lg', h.tile, h.icon)}>
        <Icon className="size-icon" strokeWidth={1.75} />
      </span>
      {trend ? (
        <ArrowUpRight aria-hidden className={cn('absolute top-4 right-4 size-4', h.icon)} strokeWidth={1.75} />
      ) : null}
      <p className={cn('relative mt-2.5 text-caption', h.label)}>{label}</p>
      <p className={cn('relative text-xl leading-7 font-bold tracking-[-0.01em]', h.value)}>{value}</p>
      <p className={cn('relative mt-0.5 flex items-center gap-1 text-caption opacity-85', h.label)}>{caption}</p>
    </div>
  )
}

export function CompanyStatCards() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        hue="blue"
        icon={FolderOpen}
        label="Total Projects"
        value="12"
        trend
        caption={
          <>
            <TrendingUp className="size-3.5 shrink-0" strokeWidth={2} />
            +15.5% this month
          </>
        }
      />
      <StatCard hue="violet" icon={SquareCheck} label="Active Tasks" value="46" caption="27 completed" trend />
      <StatCard hue="indigo" icon={Users} label="Total Clients" value="12" caption="9 active" trend />
      <StatCard hue="emerald" icon={DollarSign} label="Total Revenue" value="$195,515.00" caption="$6,900.00 paid" />
    </div>
  )
}
