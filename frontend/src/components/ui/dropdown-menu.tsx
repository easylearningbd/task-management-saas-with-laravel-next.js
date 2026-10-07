'use client'

import * as React from 'react'
import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui'
import { cn } from '@/lib/cn'

/* design-system/components/DropdownMenu.md — a `popover` panel on `radius-lg` with a 1px
   `border`, `shadow-lg` and 4px padding, 4px below its trigger and aligned to its edge.
   Items are 34px on `radius-md` with a 16px leading icon 10px from the label, `accent` when
   highlighted; a destructive item is `danger` on `danger-soft`. Section labels are 11px
   uppercase `muted-foreground`; groups are split by a full-bleed 1px rule. Radix supplies
   the keyboard model (arrows, Home/End, typeahead, Escape) and focus return.
   A disabled item stays visible at `opacity-disabled` and may carry a trailing `hint`
   ("Coming soon") so the reason is readable, not just implied. Item classes match the
   user menu's (features/auth/components/user-menu.tsx). */

const DropdownMenu = DropdownMenuPrimitive.Root
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger
const DropdownMenuGroup = DropdownMenuPrimitive.Group

function DropdownMenuContent({
  className,
  align = 'end',
  sideOffset = 4,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn('z-50 w-58 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg', className)}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  )
}

function DropdownMenuLabel({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Label>) {
  return (
    <DropdownMenuPrimitive.Label
      className={cn('px-2 pt-2 pb-1 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase', className)}
      {...props}
    />
  )
}

function DropdownMenuItem({
  className,
  tone = 'default',
  hint,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Item> & {
  tone?: 'default' | 'danger'
  /** Trailing note, e.g. "Coming soon" on a disabled item. */
  hint?: string
}) {
  return (
    <DropdownMenuPrimitive.Item
      className={cn(
        'flex h-8.5 cursor-default items-center gap-2.5 rounded-md px-2 text-body outline-none select-none',
        'data-disabled:cursor-not-allowed data-disabled:opacity-disabled',
        tone === 'danger' ? 'text-danger focus:bg-danger-soft' : 'focus:bg-accent',
        className,
      )}
      {...props}
    >
      {children}
      {hint ? <span className="ml-auto pl-3 text-caption font-normal text-muted-foreground">{hint}</span> : null}
    </DropdownMenuPrimitive.Item>
  )
}

function DropdownMenuSeparator({ className, ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return <DropdownMenuPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-border', className)} {...props} />
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuSeparator,
}
