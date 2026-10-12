'use client'

import * as React from 'react'
import { Input } from '@/components/ui/input'

/* A decimal amount (prices, discounts, payments — and quantities, which also take 2 places). Input.md
   unchanged, with the numeric keyboard on phones (`inputMode="decimal"`); typing is kept to digits
   and one ".", at most `decimals` places, never negative — so "12.345" or "-3" can't be entered
   (the schema and the server check again). Works with react-hook-form's `register` (the cleaned
   value is written back before `onChange` runs). The value stays a string: amounts are never
   floats. */

/** Digits and one ".", at most `decimals` places. */
export function sanitizeDecimal(raw: string, decimals = 2): string {
  const cleaned = raw.replace(/[^\d.]/g, '')
  const dot = cleaned.indexOf('.')
  if (dot === -1) return cleaned
  return `${cleaned.slice(0, dot)}.${cleaned.slice(dot + 1).replace(/\./g, '').slice(0, decimals)}`
}

export function MoneyInput({
  onChange,
  decimals = 2,
  ...props
}: Omit<React.ComponentProps<typeof Input>, 'type' | 'inputMode'> & { decimals?: number }) {
  return (
    <Input
      {...props}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      onChange={(event) => {
        const clean = sanitizeDecimal(event.target.value, decimals)
        if (clean !== event.target.value) event.target.value = clean
        onChange?.(event)
      }}
    />
  )
}
