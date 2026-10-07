'use client'

import * as React from 'react'
import { DateInput } from '@/components/ui/date-input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/cn'

/* A from → to date range for a filter bar — design-system/components/DateInput.md: "Date
   ranges are two of these side by side, from first then to second, and the second rejects
   anything before the first"; in a filter bar the Calendar glyph leads. Values are YYYY-MM-DD
   ('' = open end). Labels are visible above the inputs, or kept for screen readers only when
   the bar shows bare inputs (the Companies screenshot). */
export function DateRangeFilter({
  from,
  to,
  onFromChange,
  onToChange,
  fromLabel,
  toLabel,
  showLabels = false,
  inputClassName,
  className,
}: {
  from: string
  to: string
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  fromLabel: string
  toLabel: string
  showLabels?: boolean
  /** Width of each input (e.g. "sm:w-56"); full width on phones. */
  inputClassName?: string
  className?: string
}) {
  const fromId = React.useId()
  const toId = React.useId()

  return (
    <div className={cn('flex w-full flex-wrap items-end gap-3 sm:w-auto', className)}>
      <div className={cn('flex w-full flex-col gap-1.5', inputClassName)}>
        <Label htmlFor={fromId} className={cn(!showLabels && 'sr-only')}>
          {fromLabel}
        </Label>
        <DraftDateInput id={fromId} value={from} max={to || undefined} onCommit={onFromChange} />
      </div>
      <div className={cn('flex w-full flex-col gap-1.5', inputClassName)}>
        <Label htmlFor={toId} className={cn(!showLabels && 'sr-only')}>
          {toLabel}
        </Label>
        <DraftDateInput id={toId} value={to} min={from || undefined} onCommit={onToChange} />
      </div>
    </div>
  )
}

/* A native date input reports a value as soon as every segment holds a digit, so typing the
   year "2026" passes through 0002, 0020 and 0202. Committing those would refilter the list on
   every key — and the URL round trip resets the field mid-typing. So the field keeps what is
   being typed as a draft and commits only a plausible date (a 4-digit year ≥ 1000) or a clear;
   leaving the field drops an unfinished draft and shows the committed value again. A draft
   only counts while `value` is still the one it was typed over — a change from outside
   (Reset, a URL change) wins. */
const isPlausibleDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number(value.slice(0, 4)) >= 1000

function DraftDateInput({
  id,
  value,
  min,
  max,
  onCommit,
}: {
  id: string
  value: string
  min?: string
  max?: string
  onCommit: (value: string) => void
}) {
  const [draft, setDraft] = React.useState<{ text: string; over: string } | null>(null)
  // `value` moved on (a commit landed, or Reset) → the draft is spent.
  if (draft && draft.over !== value) setDraft(null)

  return (
    <DateInput
      id={id}
      iconPosition="leading"
      value={draft && draft.over === value ? draft.text : value}
      min={min}
      max={max}
      onChange={(event) => {
        const next = event.target.value
        setDraft({ text: next, over: value })
        if ((next === '' || isPlausibleDate(next)) && next !== value) onCommit(next)
      }}
      onBlur={() => setDraft(null)}
    />
  )
}
