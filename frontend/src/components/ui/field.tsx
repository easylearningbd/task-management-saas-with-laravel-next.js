import * as React from 'react'
import { cn } from '@/lib/cn'

/* The field stack from design-system/components/Input.md: label, control and an optional
   caption `space-1.5` apart. Error text replaces the helper line and turns `danger`. */
function Field({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('flex flex-col gap-1.5', className)} {...props} />
}

function FieldMessage({
  className,
  error = false,
  ...props
}: React.ComponentProps<'p'> & { error?: boolean }) {
  return (
    <p
      className={cn('text-caption', error ? 'text-danger' : 'text-muted-foreground', className)}
      role={error ? 'alert' : undefined}
      {...props}
    />
  )
}

export { Field, FieldMessage }
