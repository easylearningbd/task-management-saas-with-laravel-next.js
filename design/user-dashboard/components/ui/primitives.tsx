import * as React from 'react'
import { cn } from '@/lib/cn'

/* Implements design-system/components/Card.md */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('rounded-xl border border-border bg-card shadow-xs', className)} {...props} />
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-start justify-between gap-x-4 gap-y-2 p-card pb-0', className)}>
      <div className="min-w-0">
        <h2 className="text-title-card">{title}</h2>
        {subtitle ? <p className="text-caption font-normal text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  )
}

/* Implements design-system/components/ButtonPrimary.md + ButtonOutline.md + ButtonGhost.md */
type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'outline' | 'ghost'
  size?: 'sm' | 'default' | 'lg' | 'icon' | 'icon-sm'
}

export function Button({ variant = 'outline', size = 'default', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg border border-transparent font-medium whitespace-nowrap',
        'transition-colors focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-(--opacity-disabled)',
        size === 'sm' && 'h-control-sm gap-1.5 px-3 text-button-sm',
        size === 'default' && 'h-control px-4 text-button',
        size === 'lg' && 'h-control-lg px-5 text-button',
        size === 'icon' && 'size-control text-button',
        size === 'icon-sm' && 'size-control-sm',
        variant === 'primary' &&
          'bg-primary text-primary-foreground shadow-sm hover:bg-primary-hover active:bg-primary-active',
        variant === 'outline' && 'border-border bg-card text-foreground shadow-sm hover:bg-accent',
        variant === 'ghost' && 'bg-transparent text-muted-foreground hover:bg-accent hover:text-foreground',
        className,
      )}
      {...props}
    />
  )
}

/* Implements design-system/components/Badge.md */
const BADGE_TONES = {
  success: 'bg-success-soft text-success',
  info: 'bg-info-soft text-info',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  neutral: 'bg-neutral-soft text-neutral',
} as const

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: keyof typeof BADGE_TONES }) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center gap-1 rounded-md px-2.5 text-badge whitespace-nowrap',
        BADGE_TONES[tone],
        className,
      )}
      {...props}
    />
  )
}

/* Implements design-system/components/Avatar.md — initials fallback.
   Pass `src` once real logos exist; the fallback stays underneath. */
const AVATAR_TONES = {
  emerald: 'bg-primary-soft text-primary-strong',
  info: 'bg-info-soft text-info',
  violet: 'bg-stat-violet text-stat-violet-label',
  indigo: 'bg-stat-indigo text-stat-indigo-label',
  amber: 'bg-stat-amber text-stat-amber-label',
} as const

export function Avatar({
  initials,
  tone = 'info',
  src,
  className,
}: {
  initials: string
  tone?: keyof typeof AVATAR_TONES
  src?: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full size-avatar',
        'text-[13px] font-semibold',
        AVATAR_TONES[tone],
        className,
      )}
    >
      {src ? <img src={src} alt="" className="size-full object-cover" /> : initials}
    </span>
  )
}
