'use client'

import * as React from 'react'
import { Switch as SwitchPrimitive } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/lib/cn'

/* design-system/components/Switch.md — a 44×24 track on `radius-full` with a 20px white knob
   carrying `shadow-sm`; off is `track`, on is `primary`. A 36×20 `sm` size exists for dense
   rows; there is no third size and never text in the track. Radix renders a real
   <button role="switch" aria-checked> (Space/Enter toggle). Give it an accessible name via a
   <Label htmlFor>, `aria-label` or `aria-labelledby`. */
const trackVariants = cva(
  'peer inline-flex shrink-0 cursor-pointer items-center rounded-full bg-track p-0.5 transition-colors ' +
    'data-[state=checked]:bg-primary focus-visible:shadow-focus focus-visible:outline-none ' +
    'disabled:cursor-not-allowed disabled:opacity-disabled',
  {
    variants: { size: { default: 'h-6 w-11', sm: 'h-5 w-9' } },
    defaultVariants: { size: 'default' },
  },
)

const thumbVariants = cva(
  // `primary-foreground` is white in both themes — the spec's white knob.
  'pointer-events-none block rounded-full bg-primary-foreground shadow-sm transition-transform data-[state=unchecked]:translate-x-0',
  {
    variants: { size: { default: 'size-5 data-[state=checked]:translate-x-5', sm: 'size-4 data-[state=checked]:translate-x-4' } },
    defaultVariants: { size: 'default' },
  },
)

function Switch({
  className,
  size,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & VariantProps<typeof trackVariants>) {
  return (
    <SwitchPrimitive.Root className={cn(trackVariants({ size }), className)} {...props}>
      <SwitchPrimitive.Thumb className={thumbVariants({ size })} />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
