'use client'

import * as React from 'react'
import { Filter } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { SearchInput } from '@/components/ui/search-input'
import { cn } from '@/lib/cn'

/* The list page's filter bar: its own card (Card.md — "a card that holds a filter bar uses
   `space-4` instead of `card-padding`"), one row that wraps on narrow screens:
   SearchInput (SearchInput.md, 300ms debounce) · the page's select filters (children) ·
   pushed right, an outline `Filters` button with the `Filter` glyph (ButtonOutline.md toolbar
   size) that opens an inline advanced panel under a 1px rule, ending with a Reset action.

   Density: `default` follows the specs (16px padding, 40px search); `compact` matches the
   Coupons screenshot (12px padding, 32px search).

   Search is controlled by the page (usually from the URL) and reported debounced; typing
   keeps a local draft so the field stays instant. The X clears at once. External changes
   (Reset, back/forward) overwrite the draft. */

export type FilterBarProps = {
  search: string
  /** Called 300ms after typing stops (immediately on clear / Enter). */
  onSearchChange: (value: string) => void
  searchPlaceholder?: string
  /** Inline filters (selects) placed after the search field. */
  children?: React.ReactNode
  /** Content of the advanced panel; when given, the Filters button is shown. */
  advanced?: React.ReactNode
  /** Open the advanced panel initially (e.g. when an advanced filter is already set). */
  defaultAdvancedOpen?: boolean
  /** Clears every filter, the search included. Shown in the advanced panel. */
  onReset?: () => void
  /** Disables Reset when nothing is filtered. */
  canReset?: boolean
  density?: 'default' | 'compact'
  className?: string
}

export const SEARCH_DEBOUNCE_MS = 300

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder,
  children,
  advanced,
  defaultAdvancedOpen = false,
  onReset,
  canReset = true,
  density = 'default',
  className,
}: FilterBarProps) {
  const compact = density === 'compact'
  const t = useTranslations('shared.filters')
  const panelId = React.useId()
  const [open, setOpen] = React.useState(defaultAdvancedOpen)

  // Local draft of the search text, re-synced whenever the controlled value changes.
  const [draft, setDraft] = React.useState(search)
  const [synced, setSynced] = React.useState(search)
  if (search !== synced) {
    setSynced(search)
    setDraft(search)
  }

  const report = React.useEffectEvent((value: string) => {
    if (value !== search) onSearchChange(value)
  })
  React.useEffect(() => {
    const timer = window.setTimeout(() => report(draft), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [draft])

  return (
    <div className={cn('rounded-xl border border-border bg-card shadow-xs', compact ? 'p-3' : 'p-4', className)}>
      <div className="flex flex-wrap items-center gap-3">
        <SearchInput
          value={draft}
          onValueChange={setDraft}
          onClear={() => {
            setDraft('')
            onSearchChange('')
          }}
          onKeyDown={(event) => {
            if (event.key === 'Enter') report(draft)
          }}
          placeholder={searchPlaceholder ?? t('searchPlaceholder')}
          aria-label={t('searchLabel')}
          clearLabel={t('clearSearch')}
          size={compact ? 'sm' : 'lg'}
          className="w-full sm:w-64"
        />
        {children}
        {advanced ? (
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            aria-expanded={open}
            aria-controls={panelId}
            onClick={() => setOpen((value) => !value)}
          >
            <Filter className="size-3.5" aria-hidden="true" />
            {t('filters')}
          </Button>
        ) : null}
      </div>

      {advanced ? (
        <div
          id={panelId}
          role="group"
          aria-label={t('advanced')}
          hidden={!open}
          className={cn('border-t border-border', compact ? 'mt-3 pt-3' : 'mt-4 pt-4')}
        >
          <div className="flex flex-wrap items-end gap-3">
            {advanced}
            {onReset ? (
              <Button variant="outline" size="sm" className="ml-auto" onClick={onReset} disabled={!canReset}>
                {t('reset')}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
