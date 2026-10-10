'use client'

import * as React from 'react'
import { Button, type ButtonProps } from '@/components/ui/button'

/* A file picker that looks like a Button (ButtonOutline.md by default). Not in the design
   system — it is the existing Button driving a visually hidden <input type="file">, so it is
   reached and activated by keyboard like any button (Tab, then Enter/Space). The input is
   reset after each pick so choosing the same file twice still fires `onSelect`.
   `multiple` lets the dialog pick several files; they arrive together in `onSelectMany`. */
export function FileButton({
  accept,
  onSelect,
  onSelectMany,
  multiple = false,
  variant = 'outline',
  name,
  children,
  ...buttonProps
}: Omit<ButtonProps, 'onClick' | 'onSelect' | 'type' | 'asChild'> & {
  /** e.g. "image/jpeg,image/png,image/gif" */
  accept: string
  /** The picked file (the first one, when several were picked). */
  onSelect?: (file: File) => void
  /** Every picked file (with `multiple`). */
  onSelectMany?: (files: File[]) => void
  multiple?: boolean
  /** Form field name for the hidden input (not needed when uploading from script). */
  name?: string
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={accept}
        multiple={multiple}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? [])
          event.target.value = ''
          if (files.length === 0) return
          onSelectMany?.(files)
          onSelect?.(files[0])
        }}
      />
      <Button {...buttonProps} type="button" variant={variant} onClick={() => inputRef.current?.click()}>
        {children}
      </Button>
    </>
  )
}
