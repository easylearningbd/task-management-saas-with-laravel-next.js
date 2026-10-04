import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

/* design-system/components/EmptyState.md — centred with `space-12` of vertical air:
   a 56px `muted` circle holding a 26px glyph, a `title-card` line, a `body` muted sentence
   capped at ~340px, and an optional action. The "Couldn't load" flavour tints the circle
   `danger` on `danger-soft`. `framed` adds the stand-alone card border; inside a card,
   leave it off. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = 'default',
  framed = false,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  tone?: 'default' | 'danger'
  framed?: boolean
  className?: string
}) {
  return (
    <div
      role={tone === 'danger' ? 'alert' : undefined}
      className={cn('px-card py-12 text-center', framed && 'rounded-xl border border-border bg-card', className)}
    >
      <span
        className={cn(
          'inline-flex size-14 items-center justify-center rounded-full',
          tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-muted text-muted-foreground',
        )}
      >
        <Icon className="size-6.5" aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-title-card">{title}</h3>
      {description ? <p className="mx-auto mt-1.5 max-w-85 text-body text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4.5 flex justify-center">{action}</div> : null}
    </div>
  )
}
