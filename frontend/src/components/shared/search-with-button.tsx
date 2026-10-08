'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/search-input'
import { cn } from '@/lib/cn'

/* An explicit search: the SearchInput with a primary action button on its right. Nothing runs
   while typing — the search is submitted by the button or by Enter (a real form with
   role="search"). The X inside the field clears it and submits the empty search at once, so
   the full list comes back without a second step. Field and button share `control-height`;
   the field takes the remaining width, 8px from the button. */

export type SearchWithButtonProps = {
  /** The text in the box (may differ from the applied search until submitted). */
  value: string
  onValueChange: (value: string) => void
  /** Runs the search with the trimmed text ('' = no search). */
  onSubmit: (value: string) => void
  placeholder: string
  /** The button's text, e.g. "Search". */
  buttonLabel: string
  /** The field's accessible name. */
  label: string
  className?: string
}

export function SearchWithButton({ value, onValueChange, onSubmit, placeholder, buttonLabel, label, className }: SearchWithButtonProps) {
  const t = useTranslations('shared.filters')

  return (
    <form
      role="search"
      aria-label={label}
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit(value.trim())
      }}
      className={cn('flex items-center gap-2', className)}
    >
      <SearchInput
        size="default"
        value={value}
        onValueChange={onValueChange}
        onClear={() => {
          onValueChange('')
          onSubmit('')
        }}
        placeholder={placeholder}
        aria-label={label}
        clearLabel={t('clearSearch')}
        className="min-w-0 flex-1"
      />
      <Button type="submit">{buttonLabel}</Button>
    </form>
  )
}
