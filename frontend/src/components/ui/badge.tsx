import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

/* design-system/components/Badge.md — a 24px pill on `radius-md`, 10px side padding,
   `badge` text. Soft ground + its own text color; never a solid fill, never a border.
   success: Active/Paid/Approved · info: Completed/Signed/Sent/plan names ·
   warning: Pending/Partial · danger: Rejected/Cancelled/Overdue · neutral: Draft/Inactive */
const badgeVariants = cva('inline-flex h-6 items-center gap-1 rounded-md px-2.5 text-badge whitespace-nowrap', {
  variants: {
    tone: {
      success: 'bg-success-soft text-success',
      info: 'bg-info-soft text-info',
      warning: 'bg-warning-soft text-warning',
      danger: 'bg-danger-soft text-danger',
      neutral: 'bg-neutral-soft text-neutral',
    },
  },
  defaultVariants: { tone: 'neutral' },
})

function Badge({ className, tone, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />
}

export { Badge, badgeVariants }
