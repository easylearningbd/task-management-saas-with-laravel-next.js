'use client'

import * as React from 'react'
import { Button, type ButtonProps } from '@/components/ui/button'

/* A file picker that looks like a Button (ButtonOutline.md by default). Not in the design
   system — it is the existing Button driving a visually hidden <input type="file">, so it is
   reached and activated by keyboard like any button (Tab, then Enter/Space). The input is
   reset after each pick so choosing the same file twice still fires `onSelect`. */
export function FileButton({
  accept,
  onSelect,
  variant = 'outline',
  name,
  children,
  ...buttonProps
}: Omit<ButtonProps, 'onClick' | 'onSelect' | 'type' | 'asChild'> & {
  /** e.g. "image/jpeg,image/png,image/gif" */
  accept: string
  onSelect: (file: File) => void
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
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ''
          if (file) onSelect(file)
        }}
      />
      <Button {...buttonProps} type="button" variant={variant} onClick={() => inputRef.current?.click()}>
        {children}
      </Button>
    </>
  )
}
