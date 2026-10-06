'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/dialog'

/* Create / edit one record in a modal — design-system/components/Modal.md: the title names the
   action ("Add New Coupon"), the body holds the fields, the footer has Cancel (outline) then
   the primary action. `lg` (872px) for two-column forms, `sm` (468px) for one column.
   - Focus moves to the first field on open (not the X) and returns to the trigger on close.
   - Escape, a scrim click, the X and Cancel all close — except while a submit is in flight.
   - With unsaved changes (`dirty`), closing asks first ("Discard changes?").
   - `error` shows a form-level alert above the fields (field errors go under each field). */

export type FormModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  onSubmit: React.FormEventHandler<HTMLFormElement>
  children: React.ReactNode
  size?: 'sm' | 'lg'
  submitLabel?: string
  cancelLabel?: string
  /** Submitting: Save shows a spinner, nothing can close the modal. */
  pending?: boolean
  /** Unsaved changes: closing asks for confirmation. */
  dirty?: boolean
  error?: React.ReactNode
  /** A rule under the header (see DialogContent). */
  divided?: boolean
}

const FOCUSABLE =
  'input:not([type="hidden"]):not([disabled]):not([aria-hidden="true"]), textarea:not([disabled]), ' +
  'button:not([disabled]):not([aria-hidden="true"]), [tabindex]:not([tabindex="-1"])'

export function FormModal({
  open,
  onOpenChange,
  title,
  onSubmit,
  children,
  size = 'lg',
  submitLabel,
  cancelLabel,
  pending = false,
  dirty = false,
  error,
  divided = false,
}: FormModalProps) {
  const t = useTranslations('shared.modal')
  const bodyRef = React.useRef<HTMLDivElement>(null)
  const [confirmDiscard, setConfirmDiscard] = React.useState(false)

  const requestClose = () => {
    if (pending) return
    if (dirty) setConfirmDiscard(true)
    else onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : requestClose())}>
      <DialogContent
        size={size}
        heading={title}
        closeLabel={t('close')}
        closeDisabled={pending}
        divided={divided}
        onOpenAutoFocus={(event) => {
          const first = bodyRef.current?.querySelector<HTMLElement>(FOCUSABLE)
          if (first) {
            event.preventDefault()
            first.focus()
          }
        }}
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault()
        }}
      >
        <form noValidate onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
          <DialogBody ref={bodyRef}>
            {error ? (
              <Alert tone="danger" className="mb-4.5">
                {error}
              </Alert>
            ) : null}
            {children}
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" onClick={requestClose} disabled={pending}>
              {cancelLabel ?? t('cancel')}
            </Button>
            <Button type="submit" loading={pending}>
              {submitLabel ?? t('save')}
            </Button>
          </DialogFooter>
        </form>

        <ConfirmDialog
          open={confirmDiscard}
          onOpenChange={setConfirmDiscard}
          title={t('discardTitle')}
          description={t('discardDescription')}
          confirmLabel={t('discard')}
          cancelLabel={t('keepEditing')}
          closeLabel={t('close')}
          onConfirm={() => {
            setConfirmDiscard(false)
            onOpenChange(false)
          }}
        />
      </DialogContent>
    </Dialog>
  )
}
