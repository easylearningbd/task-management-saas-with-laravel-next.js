'use client'

import * as React from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useReturnFocus } from '@/lib/use-return-focus'
import { cn } from '@/lib/cn'

/* design-system/components/Modal.md — a `card` sheet on `radius-xl` with `shadow-xl`, centred
   over an `overlay` scrim. Widths: `sm` 468px (one column of fields), `lg` 872px (two-column
   forms like Add New Coupon); never wider than the viewport minus a 16px gutter. Height is the
   content's; past the viewport the body scrolls while the header and footer stay put.
   Header pads 22px/24px with a `title-section` title and a ghost X in `muted-foreground`;
   body pads 0/24px/22px; footer sits above a 1px `border` rule, actions right-aligned.
   `divided`: a 1px rule under the header too (16px/24px header, 20px above the body), as drawn
   in the Add New Coupon screenshot.
   Radix Dialog: focus trapped, Escape/scrim/X close, page scroll locked, everything behind
   hidden from assistive tech. Focus returns to whatever opened the dialog (useReturnFocus —
   Radix alone only returns it to a <Dialog.Trigger>). */

const Dialog = DialogPrimitive.Root
const DialogTrigger = DialogPrimitive.Trigger
const DialogClose = DialogPrimitive.Close
const DialogDescription = DialogPrimitive.Description

const contentVariants = cva(
  'fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col ' +
    'rounded-xl bg-card text-card-foreground shadow-xl focus:outline-none',
  {
    // md (672px): a single-column list of rich choices, as measured in the Upgrade Plan screenshot.
    variants: { size: { sm: 'sm:w-[468px]', md: 'sm:w-2xl', lg: 'sm:w-[872px]' } },
    defaultVariants: { size: 'sm' },
  },
)

function DialogContent({
  className,
  size,
  heading,
  description,
  closeLabel,
  closeDisabled = false,
  divided = false,
  children,
  onOpenAutoFocus,
  onCloseAutoFocus,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> &
  VariantProps<typeof contentVariants> & {
    /** The `title-section` heading (Radix Dialog.Title). Named `heading` because `title` is an HTML attribute. */
    heading: React.ReactNode
    /** A `body-sm` `muted-foreground` line under the title (Radix Dialog.Description). */
    description?: React.ReactNode
    /** aria-label for the X button. */
    closeLabel: string
    closeDisabled?: boolean
    divided?: boolean
  }) {
  const focus = useReturnFocus({ onOpenAutoFocus, onCloseAutoFocus })
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-overlay" />
      {/* No description by default (pass aria-describedby / a DialogDescription to add one). */}
      <DialogPrimitive.Content
        aria-describedby={undefined}
        className={cn(contentVariants({ size }), className)}
        {...props}
        {...focus}
      >
        <div
          className={cn(
            'flex shrink-0 items-start justify-between gap-4',
            divided ? 'mb-5 border-b border-border px-6 py-4' : 'p-6 pb-4.5',
          )}
        >
          <div className="min-w-0">
            <DialogPrimitive.Title className="text-title-section">{heading}</DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-1 text-body-sm text-muted-foreground">{description}</DialogPrimitive.Description>
            ) : null}
          </div>
          <DialogPrimitive.Close asChild>
            <Button variant="ghost" size="icon-sm" aria-label={closeLabel} disabled={closeDisabled} className="-mt-1 -mr-2">
              <X className="size-icon" aria-hidden="true" />
            </Button>
          </DialogPrimitive.Close>
        </div>
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

/** The scrolling middle. */
function DialogBody({ className, ...props }: React.ComponentProps<'div'>) {
  return <div className={cn('min-h-0 flex-1 overflow-y-auto px-6 pb-5.5', className)} {...props} />
}

function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      className={cn('flex shrink-0 flex-wrap justify-end gap-2.5 border-t border-border px-6 py-3.5', className)}
      {...props}
    />
  )
}

export { Dialog, DialogTrigger, DialogClose, DialogContent, DialogBody, DialogFooter, DialogDescription }
