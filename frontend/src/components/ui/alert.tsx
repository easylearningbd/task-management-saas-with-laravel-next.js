import * as React from 'react'
import { CircleAlert, CircleCheck, Info, TriangleAlert, type LucideIcon } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

/* Not in the design system (approved in M1 decision F). Built from the status rule in
   brand-book.md: a soft ground plus its own text color, always paired, never a border
   or a solid fill — the same treatment as Badge. Used for form-level messages. */
const alertVariants = cva('flex items-start gap-2.5 rounded-lg px-3.5 py-3 text-body-sm', {
  variants: {
    tone: {
      danger: 'bg-danger-soft text-danger',
      warning: 'bg-warning-soft text-warning',
      info: 'bg-info-soft text-info',
      success: 'bg-success-soft text-success',
    },
  },
  defaultVariants: { tone: 'danger' },
})

const ICONS: Record<NonNullable<VariantProps<typeof alertVariants>['tone']>, LucideIcon> = {
  danger: CircleAlert,
  warning: TriangleAlert,
  info: Info,
  success: CircleCheck,
}

function Alert({
  className,
  tone,
  title,
  children,
  ...props
}: React.ComponentProps<'div'> & VariantProps<typeof alertVariants> & { title?: string }) {
  const Icon = ICONS[tone ?? 'danger']
  const urgent = tone === 'danger' || tone === 'warning' || tone == null

  return (
    <div role={urgent ? 'alert' : 'status'} className={cn(alertVariants({ tone }), className)} {...props}>
      <Icon className="mt-px size-icon shrink-0" aria-hidden="true" />
      <div className="min-w-0">
        {title ? <p className="font-medium">{title}</p> : null}
        {children ? <div className={title ? 'mt-0.5' : undefined}>{children}</div> : null}
      </div>
    </div>
  )
}

export { Alert }
