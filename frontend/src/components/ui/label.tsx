import * as React from 'react'
import { cn } from '@/lib/cn'

/* The label from design-system/components/Input.md: `label` type, Title Case, no colon,
   a `destructive` asterisk after it when the field is required. */
function Label({
  className,
  required = false,
  requiredLabel = 'required',
  children,
  ...props
}: React.ComponentProps<'label'> & {
  required?: boolean
  /** Screen-reader text for the asterisk; pass the translated word. */
  requiredLabel?: string
}) {
  return (
    <label className={cn('text-label text-foreground', className)} {...props}>
      {children}
      {required ? (
        <>
          <span aria-hidden="true" className="ml-0.5 text-destructive">
            *
          </span>
          <span className="sr-only"> ({requiredLabel})</span>
        </>
      ) : null}
    </label>
  )
}

export { Label }
