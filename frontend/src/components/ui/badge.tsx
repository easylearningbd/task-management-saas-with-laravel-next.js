import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

/* design-system/components/Badge.md — a 24px pill on `radius-md`, 10px side padding,
   `badge` text. Soft ground + its own text color; never a solid fill, never a border.
   success: Active/Paid/Approved · info: Completed/Signed/Sent/plan names/Default/trials ·
   warning: Pending/Partial · danger: Rejected/Cancelled/Overdue · neutral: Draft/Inactive
   Two specials:
   - `solid`: Badge.md's one solid badge — the `Save 20%` pill (`success-solid`, white text).
   - `outlined`: a hairline in the badge's own color at 20%, as drawn on the plan cards in the
     Plans screenshot (Badge.md says no border; the screenshot wins there, approved). */
const badgeVariants = cva('inline-flex items-center gap-1 rounded-md whitespace-nowrap', {
  variants: {
    tone: {
      success: 'bg-success-soft text-success',
      info: 'bg-info-soft text-info',
      warning: 'bg-warning-soft text-warning',
      danger: 'bg-danger-soft text-danger',
      neutral: 'bg-neutral-soft text-neutral',
      solid: 'bg-success-solid text-primary-foreground',
    },
    size: {
      default: 'h-6 px-2.5 text-badge',
      /** Compact pill riding inside a control (the segmented control's `Save 20%`). */
      sm: 'h-5 px-2 text-badge',
    },
    outlined: {
      true: 'border border-current/20',
      false: '',
    },
  },
  defaultVariants: { tone: 'neutral', size: 'default', outlined: false },
})

function Badge({
  className,
  tone,
  size,
  outlined,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone, size, outlined }), className)} {...props} />
}

export { Badge, badgeVariants }
