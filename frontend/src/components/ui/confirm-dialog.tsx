'use client'

import * as React from 'react'
import { AlertDialog } from 'radix-ui'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/cn'
import { useReturnFocus } from '@/lib/use-return-focus'

/* design-system/components/Modal.md — the destructive confirm: the Modal sheet at 420px
   (`card`, `radius-xl`, `shadow-xl`) over an `overlay` scrim. Header 24px/18px padding with a
   `title-section` title and a ghost X; body repeats the record's name; footer above a 1px
   rule with Cancel (outline) then the action (`destructive` fill). Escape, the X and Cancel
   all dismiss — except while the action is in flight. Built on Radix AlertDialog
   (role="alertdialog", focus trapped); focus returns to whatever opened it (useReturnFocus). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel,
  closeLabel,
  onConfirm,
  pending = false,
  error,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: React.ReactNode
  confirmLabel: string
  cancelLabel: string
  /** aria-label for the X button. */
  closeLabel: string
  onConfirm: () => void
  /** The action is running: buttons disabled, spinner on confirm, dialog can't be dismissed. */
  pending?: boolean
  /** A reason the action failed (e.g. the server's 422 message), shown in `danger`. */
  error?: string | null
}) {
  const focus = useReturnFocus()
  const guard = (next: boolean) => {
    if (!pending) onOpenChange(next)
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={guard}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-overlay" />
        <AlertDialog.Content
          {...focus}
          onEscapeKeyDown={(event) => pending && event.preventDefault()}
          className={cn(
            'fixed top-1/2 left-1/2 z-50 w-[420px] max-w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2',
            'rounded-xl bg-card text-card-foreground shadow-xl focus:outline-none',
          )}
        >
          <div className="flex items-start justify-between gap-4 p-6 pb-4.5">
            <AlertDialog.Title className="text-title-section">{title}</AlertDialog.Title>
            <AlertDialog.Cancel asChild>
              <Button variant="ghost" size="icon-sm" aria-label={closeLabel} disabled={pending} className="-mt-1 -mr-2">
                <X className="size-icon" aria-hidden="true" />
              </Button>
            </AlertDialog.Cancel>
          </div>

          <div className="px-6 pb-5.5">
            <AlertDialog.Description className="text-body text-muted-foreground">{description}</AlertDialog.Description>
            {error ? (
              <p role="alert" className="mt-3 text-body-sm text-danger">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2.5 border-t border-border px-6 py-3.5">
            <AlertDialog.Cancel asChild>
              <Button variant="outline" disabled={pending}>
                {cancelLabel}
              </Button>
            </AlertDialog.Cancel>
            {/* Not AlertDialog.Action: that would close immediately; we close after success. */}
            <Button variant="destructive" loading={pending} onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
