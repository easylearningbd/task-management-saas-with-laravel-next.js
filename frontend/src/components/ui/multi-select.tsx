'use client'

import * as React from 'react'
import { Popover } from 'radix-ui'
import { ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Checkbox } from '@/components/ui/checkbox'
import { selectTriggerVariants } from '@/components/ui/select'
import { cn } from '@/lib/cn'

/* Pick several options (the invoice form's Tax, "Select taxes"). Not in the design system — built
   from its parts: the trigger IS Select.md's trigger (same height, border, radius, chevron; the
   placeholder in `muted-foreground`), showing the chosen labels joined by commas (truncated); the
   panel is Select.md's `popover` panel (4px below, `radius-lg`, 1px `border`, `shadow-lg`, 4px
   padding, at least the trigger's width) holding one 32px row per option — a Checkbox.md box and
   its label, `accent` on hover — as a labelled group of real checkboxes: Tab / Shift-Tab move
   between them, Space toggles, Escape closes and returns focus to the trigger. It stays open while
   choosing. `invalid` gives the trigger the error border; the message itself is announced through
   `describedBy` (a button can't carry aria-invalid). */

export type MultiSelectOption = { value: string; label: string }

export function MultiSelect({
  id,
  value,
  onValueChange,
  options,
  placeholder,
  label,
  emptyLabel,
  disabled = false,
  invalid = false,
  describedBy,
  className,
}: {
  id?: string
  value: ReadonlyArray<string>
  onValueChange: (value: string[]) => void
  options: ReadonlyArray<MultiSelectOption>
  /** e.g. "Select taxes" */
  placeholder: string
  /** The group's accessible name (the field's label). */
  label: string
  /** Shown in the panel when there is nothing to choose. */
  emptyLabel?: string
  disabled?: boolean
  invalid?: boolean
  describedBy?: string
  className?: string
}) {
  const t = useTranslations('shared.multiSelect')
  const selected = new Set(value)
  const chosen = options.filter((option) => selected.has(option.value))
  const toggle = (option: string, on: boolean) =>
    // Keep the options' own order, whatever order they were picked in.
    onValueChange(options.map((o) => o.value).filter((v) => (v === option ? on : selected.has(v))))

  return (
    <Popover.Root>
      <Popover.Trigger asChild disabled={disabled}>
        <button
          id={id}
          type="button"
          aria-describedby={describedBy}
          className={cn(
            selectTriggerVariants({ size: 'default' }),
            chosen.length === 0 && 'text-muted-foreground',
            invalid && 'border-destructive focus-visible:shadow-focus-danger',
            className,
          )}
        >
          <span className="min-w-0 truncate text-left">{chosen.length > 0 ? chosen.map((o) => o.label).join(', ') : placeholder}</span>
          <ChevronDown className="size-icon shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          className="z-50 max-h-(--radix-popover-content-available-height) min-w-(--radix-popover-trigger-width) overflow-y-auto rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          <div role="group" aria-label={label}>
            {options.length === 0 ? (
              <p className="px-2 py-1.5 text-body text-muted-foreground">{emptyLabel ?? t('empty')}</p>
            ) : (
              options.map((option) => {
                const optionId = `${id ?? 'multi'}-${option.value}`
                return (
                  <label
                    key={option.value}
                    htmlFor={optionId}
                    className="flex h-8 cursor-pointer items-center gap-2 rounded-md px-2 text-body select-none hover:bg-accent"
                  >
                    <Checkbox id={optionId} checked={selected.has(option.value)} onCheckedChange={(on) => toggle(option.value, on === true)} />
                    <span className="truncate">{option.label}</span>
                  </label>
                )
              })
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}
