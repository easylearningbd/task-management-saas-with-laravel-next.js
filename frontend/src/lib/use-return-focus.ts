import * as React from 'react'

/* Radix Dialog / AlertDialog return focus on close only to their own <Dialog.Trigger>; when a
   dialog is opened from state (a table row action, a page button) focus falls back to <body>.
   This remembers the element that had focus when the dialog opened and restores it on close
   (if it is still in the page). Pass the returned handlers to the Content component; any
   handler of the caller's runs first and can preventDefault() to opt out. */

type AutoFocusHandler = (event: Event) => void

export function useReturnFocus(handlers: { onOpenAutoFocus?: AutoFocusHandler; onCloseAutoFocus?: AutoFocusHandler } = {}) {
  const returnTo = React.useRef<HTMLElement | null>(null)

  return {
    onOpenAutoFocus: (event: Event) => {
      // Still the opener: Radix fires this before moving focus into the dialog.
      const active = document.activeElement
      returnTo.current = active instanceof HTMLElement && active !== document.body ? active : null
      handlers.onOpenAutoFocus?.(event)
    },
    onCloseAutoFocus: (event: Event) => {
      handlers.onCloseAutoFocus?.(event)
      if (event.defaultPrevented) return
      const target = returnTo.current
      returnTo.current = null
      if (target?.isConnected) {
        event.preventDefault()
        target.focus({ preventScroll: true })
      }
    },
  }
}
