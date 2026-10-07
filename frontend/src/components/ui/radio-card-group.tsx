'use client'

import * as React from 'react'
import { RadioGroup as RadioGroupPrimitive } from 'radix-ui'
import { cn } from '@/lib/cn'

/* A vertical list of selectable cards, each one radio of a group — the plan picker in the
   Upgrade Plan screenshot. Composed from Radio.md (an 18px circle with a 1px `input` border;
   selected: `primary` border and a 10px `primary` dot) on a Card.md surface (`card`,
   `radius-xl`), with the screenshot's states: a `border-width-2` frame in `border`, and when
   selected a `primary` frame on a `primary-soft` ground.
   The whole card is the radio (a Radix RadioGroup item): arrow keys move between cards, Space
   selects, the title names it and the rest of the card describes it. */

export type RadioCardOption<V extends string> = {
  value: V
  /** The card's name (e.g. the plan name plus a "Current" badge). */
  title: React.ReactNode
  /** Everything under the title (price, description, chips). */
  description?: React.ReactNode
  disabled?: boolean
}

export function RadioCardGroup<V extends string>({
  value,
  onValueChange,
  options,
  label,
  className,
}: {
  value: V | null
  onValueChange: (value: V) => void
  options: ReadonlyArray<RadioCardOption<V>>
  /** Accessible name of the group. */
  label: string
  className?: string
}) {
  const baseId = React.useId()

  return (
    <RadioGroupPrimitive.Root
      value={value ?? ''}
      onValueChange={(next) => onValueChange(next as V)}
      aria-label={label}
      className={cn('flex flex-col gap-4', className)}
    >
      {options.map((option) => {
        const titleId = `${baseId}-${option.value}-title`
        const descriptionId = `${baseId}-${option.value}-description`
        return (
          <RadioGroupPrimitive.Item
            key={option.value}
            value={option.value}
            disabled={option.disabled}
            aria-labelledby={titleId}
            aria-describedby={option.description ? descriptionId : undefined}
            className={cn(
              'group flex w-full items-start gap-3 rounded-xl border-2 border-border bg-card p-4 text-left transition-colors',
              'hover:border-muted-foreground data-[state=checked]:border-primary data-[state=checked]:bg-primary-soft',
              'focus-visible:shadow-focus focus-visible:outline-none',
              'disabled:cursor-not-allowed disabled:opacity-disabled',
            )}
          >
            <span
              aria-hidden="true"
              className="mt-0.5 inline-flex size-4.5 shrink-0 items-center justify-center rounded-full border border-input bg-card transition-colors group-data-[state=checked]:border-primary"
            >
              <RadioGroupPrimitive.Indicator className="block size-2.5 rounded-full bg-primary" />
            </span>
            <span className="min-w-0 flex-1">
              <span id={titleId} className="flex flex-wrap items-center gap-2">
                {option.title}
              </span>
              {option.description ? (
                <span id={descriptionId} className="mt-1 block">
                  {option.description}
                </span>
              ) : null}
            </span>
          </RadioGroupPrimitive.Item>
        )
      })}
    </RadioGroupPrimitive.Root>
  )
}
