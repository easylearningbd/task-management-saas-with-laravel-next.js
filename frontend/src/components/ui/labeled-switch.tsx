'use client'

import * as React from 'react'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/cn'

/* A two-choice switch with a word on each side — "Monthly ◯ Yearly" (the Upgrade Plan
   screenshot). Built on Switch.md's 44×24 switch: off = the left choice, on = the right one.
   The active side's label is `primary` at 500 (the screenshot's green word); the other is
   `muted-foreground`. Clicking either word picks it; the switch itself is the keyboard
   control (Space toggles) with role="switch", named by `label` ("Yearly billing").
   Not the SegmentedControl — the screenshot uses a plain switch here. */
export function LabeledSwitch({
  checked,
  onCheckedChange,
  offLabel,
  onLabel,
  label,
  disabled = false,
  className,
}: {
  /** true = the right-hand (`onLabel`) choice. */
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  offLabel: string
  onLabel: string
  /** Accessible name of the switch, saying what "on" means. */
  label: string
  disabled?: boolean
  className?: string
}) {
  const word = (active: boolean) =>
    cn('text-body font-medium transition-colors select-none', active ? 'text-primary' : 'text-muted-foreground', !disabled && 'cursor-pointer')

  return (
    <div className={cn('inline-flex items-center gap-3', className)}>
      <span aria-hidden="true" className={word(!checked)} onClick={() => !disabled && onCheckedChange(false)}>
        {offLabel}
      </span>
      <Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} aria-label={label} />
      <span aria-hidden="true" className={word(checked)} onClick={() => !disabled && onCheckedChange(true)}>
        {onLabel}
      </span>
    </div>
  )
}
