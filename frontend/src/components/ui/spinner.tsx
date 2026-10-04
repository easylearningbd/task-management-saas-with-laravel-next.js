import { LoaderCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

/* Not in the design system (approved in M1 decision F): lucide `LoaderCircle` at
   `icon-size`, inheriting currentColor. Decorative by default — the control that
   owns it carries the busy state (e.g. aria-busy on the button). */
export function Spinner({ className, label }: { className?: string; label?: string }) {
  return (
    <LoaderCircle
      className={cn('size-icon shrink-0 animate-spin', className)}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      role={label ? 'status' : undefined}
    />
  )
}
