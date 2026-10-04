import * as React from 'react'
import { Wallet, Building2, CreditCard, TrendingUp, CircleAlert, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/cn'

/* Implements design-system/components/StatCard.md — the five hues in their fixed order. */

type Hue = 'emerald' | 'blue' | 'violet' | 'indigo' | 'amber'

const HUE: Record<Hue, { card: string; tile: string; icon: string; label: string; value: string; circle: string; border: string }> = {
  emerald: { card: 'bg-stat-emerald', tile: 'bg-stat-emerald-icon-bg', icon: 'text-stat-emerald-icon', label: 'text-stat-emerald-label', value: 'text-stat-emerald-value', circle: 'text-stat-emerald-icon-bg', border: 'border-stat-emerald-icon-bg' },
  blue:    { card: 'bg-stat-blue',    tile: 'bg-stat-blue-icon-bg',    icon: 'text-stat-blue-icon',    label: 'text-stat-blue-label',    value: 'text-stat-blue-value',    circle: 'text-stat-blue-icon-bg', border: 'border-stat-blue-icon-bg' },
  violet:  { card: 'bg-stat-violet',  tile: 'bg-stat-violet-icon-bg',  icon: 'text-stat-violet-icon',  label: 'text-stat-violet-label',  value: 'text-stat-violet-value',  circle: 'text-stat-violet-icon-bg', border: 'border-stat-violet-icon-bg' },
  indigo:  { card: 'bg-stat-indigo',  tile: 'bg-stat-indigo-icon-bg',  icon: 'text-stat-indigo-icon',  label: 'text-stat-indigo-label',  value: 'text-stat-indigo-value',  circle: 'text-stat-indigo-icon-bg', border: 'border-stat-indigo-icon-bg' },
  amber:   { card: 'bg-stat-amber',   tile: 'bg-stat-amber-icon-bg',   icon: 'text-stat-amber-icon',   label: 'text-stat-amber-label',   value: 'text-stat-amber-value',   circle: 'text-stat-amber-icon-bg', border: 'border-stat-amber-icon-bg' },
}

function StatCard({
  hue, icon: Icon, label, value, caption, corner,
}: {
  hue: Hue
  icon: React.ElementType
  label: string
  value: string
  caption: React.ReactNode
  corner?: React.ReactNode
}) {
  const h = HUE[hue]
  return (
    <div className={cn('relative h-41 overflow-hidden rounded-xl border p-5 shadow-xs', h.card, h.circle, h.border)}>
      <span aria-hidden className="absolute -top-6.5 -right-6.5 size-23 rounded-full bg-current opacity-55" />
      <span aria-hidden className="absolute -bottom-4.5 right-6.5 size-11 rounded-full bg-current opacity-45" />
      <span className={cn('relative inline-flex size-tile items-center justify-center rounded-tile', h.tile, h.icon)}>
        <Icon className="size-icon-lg" strokeWidth={1.75} />
      </span>
      {corner}
      <p className={cn('relative mt-4 text-caption', h.label)}>{label}</p>
      <p className={cn('relative mt-1 text-2xl leading-8 font-bold tracking-[-0.01em]', h.value)}>{value}</p>
      <p className={cn('relative mt-0.5 flex items-center gap-1 text-caption opacity-85', h.label)}>{caption}</p>
    </div>
  )
}

export function StatCards() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <StatCard
        hue="emerald"
        icon={Wallet}
        label="Total Revenue"
        value="$2,961.20"
        caption="from approved orders"
        corner={
          <ArrowUpRight
            aria-hidden
            className="absolute top-5 right-4.5 size-[18px] text-stat-emerald-icon"
            strokeWidth={1.75}
          />
        }
      />
      <StatCard
        hue="blue"
        icon={Building2}
        label="Total Companies"
        value="7"
        caption={
          <>
            <TrendingUp className="size-3.5 shrink-0" strokeWidth={2} />
            +55% this month
          </>
        }
      />
      <StatCard hue="violet" icon={CreditCard} label="Active Plans" value="3" caption="subscription plans" />
      <StatCard hue="indigo" icon={TrendingUp} label="Monthly Growth" value="+55%" caption="vs last month" />
      <StatCard
        hue="amber"
        icon={CircleAlert}
        label="Pending Requests"
        value="6"
        caption="awaiting approval"
        corner={
          <span className="absolute top-3.5 right-3.5 inline-flex h-[22px] items-center rounded-md border border-stat-amber-icon-bg bg-warning-soft px-2 text-[11px] leading-none font-medium text-warning">
            Action needed
          </span>
        }
      />
    </div>
  )
}
