'use client'

import * as React from 'react'
import { Switch } from '@/components/ui/switch'

/* A record's on/off status inside a table row — design-system/components/Switch.md: "A switch
   in a table row toggles that record immediately and shows a Toast on failure, reverting
   itself."
   Optimistic: the switch flips at once and stays flipped while `onToggle` runs; if the
   promise rejects it flips back and `onError` is called (show the toast there). While the
   request is in flight further clicks are ignored (aria-busy) — the switch is not dimmed,
   so the new state stays readable. role="switch" + aria-checked come from Radix. */

export type StatusToggleProps = {
  checked: boolean
  /** Persist the new value; reject to revert. */
  onToggle: (next: boolean) => Promise<unknown>
  onError?: (error: unknown) => void
  /** Accessible name, e.g. "Active: Summer Sale". */
  label: string
  disabled?: boolean
  size?: 'default' | 'sm'
}

export function StatusToggle({ checked, onToggle, onError, label, disabled = false, size = 'default' }: StatusToggleProps) {
  // The value shown while a request is in flight; null = follow `checked`.
  const [pending, setPending] = React.useState<boolean | null>(null)
  const shown = pending ?? checked

  return (
    <Switch
      size={size}
      checked={shown}
      disabled={disabled}
      aria-label={label}
      aria-busy={pending !== null || undefined}
      onCheckedChange={(next) => {
        if (pending !== null) return
        setPending(next)
        onToggle(next)
          .catch((error: unknown) => onError?.(error))
          .finally(() => setPending(null))
      }}
    />
  )
}
