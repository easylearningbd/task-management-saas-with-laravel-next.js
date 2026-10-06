'use client'

import * as React from 'react'
import { Select as SelectPrimitive } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/cn'

/* design-system/components/Select.md — a Radix Select shaped exactly like Input (same height,
   border, radius, padding) with a trailing ChevronDown in `muted-foreground`. The list is a
   `popover` panel 4px below the trigger: `radius-lg`, 1px `border`, `shadow-lg`, 4px padding;
   options 32px on `radius-md`, `accent` when highlighted, the selected one `primary-strong`
   at 500 with a trailing Check.
   Sizes: `default` (form fields, filter selects — `control-height`), `sm`, the compact
   table-footer trigger from RowsPerPage.md (`control-height-sm`, 13px/500, `shadow-sm`), and
   `lg` (`control-height-lg`), the Discount Type select as measured in the Add New Coupon
   screenshot.
   Filter selects show their own default ("All Status") instead of a placeholder; Radix
   forbids "" as an item value, so give "all" a sentinel value. */

const Select = SelectPrimitive.Root
const SelectGroup = SelectPrimitive.Group
const SelectValue = SelectPrimitive.Value

const triggerVariants = cva(
  'inline-flex items-center justify-between rounded-lg border border-input bg-card text-foreground transition-colors ' +
    'hover:border-muted-foreground data-[placeholder]:text-muted-foreground ' +
    'focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none ' +
    'aria-[invalid=true]:border-destructive aria-[invalid=true]:focus-visible:shadow-focus-danger ' +
    'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-disabled ' +
    '[&>span]:truncate',
  {
    variants: {
      size: {
        default: 'h-control w-full gap-2 px-3 text-body',
        sm: 'h-control-sm gap-2 px-2.5 text-button-sm font-medium shadow-sm',
        lg: 'h-control-lg w-full gap-2 px-3 text-body',
      },
    },
    defaultVariants: { size: 'default' },
  },
)

function SelectTrigger({
  className,
  size,
  children,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Trigger> & VariantProps<typeof triggerVariants>) {
  return (
    <SelectPrimitive.Trigger className={cn(triggerVariants({ size }), className)} {...props}>
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown
          className={cn('shrink-0 text-muted-foreground', size === 'sm' ? 'size-3.5' : 'size-icon')}
          aria-hidden="true"
        />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  position = 'popper',
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        position={position}
        sideOffset={sideOffset}
        className={cn(
          'relative z-50 max-h-(--radix-select-content-available-height) min-w-(--radix-select-trigger-width) overflow-hidden',
          'rounded-lg border border-border bg-popover text-popover-foreground shadow-lg',
          className,
        )}
        {...props}
      >
        <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  )
}

function SelectItem({ className, children, ...props }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item
      className={cn(
        'relative flex h-8 cursor-pointer items-center gap-2 rounded-md pr-8 pl-2 text-body outline-none select-none',
        'data-[highlighted]:bg-accent data-[state=checked]:font-medium data-[state=checked]:text-primary-strong',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-disabled',
        className,
      )}
      {...props}
    >
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className="absolute right-2 inline-flex items-center">
        <Check className="size-icon" aria-hidden="true" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem }
