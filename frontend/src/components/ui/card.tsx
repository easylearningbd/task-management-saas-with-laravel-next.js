import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

/* design-system/components/Card.md — `card` ground, 1px `border`, `radius-xl`, `shadow-xs`.
   Header: `title-card` + `body-sm` muted subtitle. Body padded `card-padding`.
   Cards never nest inside cards. */
function Card({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-xl border border-border bg-card text-card-foreground shadow-xs', className)}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-0.5 p-card pb-0', className)} {...props} />
}

function CardTitle({ className, ...props }: React.ComponentProps<'h2'>) {
  return <h2 className={cn('text-title-card', className)} {...props} />
}

function CardDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return <p className={cn('text-body-sm text-muted-foreground', className)} {...props} />
}

/* The dashboard card head from design/admin-dashboard (components/ui/primitives.tsx
   CardHeader): `title-card` + a `caption` subtitle on the left, an action slot on the right
   (a "View all" link, a badge + year select), wrapping on narrow screens. */
/* `divided`: the head with a rule under it from design/user-dashboard (panels.tsx `Head`) —
   `px-card py-4.5` above a 1px `border`, the body starting flush under the rule; actions sit
   12px apart. */
/* `icon`: a glyph in a `control-height-sm` (32px) tile on `radius-lg`, `primary-soft` with a
   `primary-strong` glyph, before the title — the invoice cards ("Invoice Details", "Invoice
   Summary"; Invoices Phase 0 decision G — DetailsModal's header tile, at the 32px the screenshots
   measure). */
function CardHeading({
  title,
  subtitle,
  action,
  divided = false,
  icon: Icon,
  className,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  divided?: boolean
  icon?: LucideIcon
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-start justify-between gap-x-4 gap-y-2',
        divided ? 'border-b border-border px-card py-4.5' : 'p-card pb-0',
        Icon && 'items-center',
        className,
      )}
    >
      <div className={cn('min-w-0', Icon && 'flex items-center gap-3')}>
        {Icon ? (
          <span className="inline-flex size-control-sm shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary-strong">
            <Icon className="size-icon" aria-hidden="true" />
          </span>
        ) : null}
        <div className="min-w-0">
          <h2 className="text-title-card">{title}</h2>
          {subtitle ? <p className="text-caption font-normal text-muted-foreground">{subtitle}</p> : null}
        </div>
      </div>
      {action ? <div className={cn('flex shrink-0 items-center', divided ? 'gap-3' : 'gap-2')}>{action}</div> : null}
    </div>
  )
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('p-card', className)} {...props} />
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('border-t border-border p-card', className)} {...props} />
}

export { Card, CardHeader, CardHeading, CardTitle, CardDescription, CardContent, CardFooter }
