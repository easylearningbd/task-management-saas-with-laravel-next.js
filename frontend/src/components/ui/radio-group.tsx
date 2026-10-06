'use client'

import * as React from 'react'
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'
import { cn } from '@/lib/cn'

/* design-system/components/Radio.md — an 18px circle with a 1px `input` border; selected,
   the border becomes `primary` and a `primary` dot fills the middle 10px. For two or three
   mutually exclusive choices; options run inline `space-6` apart (stacked `space-2` apart
   when they carry helper text). The whole label is a click target, and one option is always
   preselected. Radix gives role="radiogroup", roving focus and arrow-key selection. */

function RadioGroup({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root className={cn('flex flex-wrap items-center gap-x-6 gap-y-2', className)} {...props} />
}

function RadioGroupItem({ className, ...props }: React.ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return (
    <RadioGroupPrimitive.Item
      className={cn(
        'inline-flex size-4.5 shrink-0 items-center justify-center rounded-full border border-input bg-card transition-colors',
        'hover:border-muted-foreground data-[state=checked]:border-primary',
        'focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:opacity-disabled',
        className,
      )}
      {...props}
    >
      <RadioGroupPrimitive.Indicator className="block size-2.5 rounded-full bg-primary" />
    </RadioGroupPrimitive.Item>
  )
}

/** One option: the radio plus its label, both clickable. */
function RadioOption({
  value,
  label,
  disabled,
  className,
}: {
  value: string
  label: React.ReactNode
  disabled?: boolean
  className?: string
}) {
  const id = React.useId()
  return (
    <div className={cn('inline-flex items-center gap-2', className)}>
      <RadioGroupItem id={id} value={value} disabled={disabled} />
      <label
        htmlFor={id}
        className={cn('cursor-pointer text-body text-foreground', disabled && 'cursor-not-allowed opacity-disabled')}
      >
        {label}
      </label>
    </div>
  )
}

export { RadioGroup, RadioGroupItem, RadioOption }
