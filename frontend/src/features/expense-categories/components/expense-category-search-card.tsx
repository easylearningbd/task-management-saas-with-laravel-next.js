'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { SearchWithButton } from '@/components/shared/search-with-button'
import { Card } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

/* The right column's first card in the screenshot: "Search categories..." with the green
   Search button attached, then the "All Statuses" select beneath (half the card's width, as
   drawn; the written spec says full width — the screenshot wins). The search is
   explicit — it runs on Search / Enter only (SearchWithButton); the status applies as soon as
   it changes. The box holds a draft that follows the URL whenever the applied search changes
   from elsewhere (Reset, a pasted link). Padded `space-4`, the filter bar's own padding
   (brand-book.md). Radix forbids "" as a value, so "all" = no status filter. */

const ALL = 'all'

export function ExpenseCategorySearchCard({
  search,
  status,
  onSearch,
  onStatusChange,
}: {
  /** The applied search (from the URL). */
  search: string
  /** The applied status filter ('' = all). */
  status: string
  onSearch: (value: string) => void
  onStatusChange: (value: string) => void
}) {
  const t = useTranslations('expenseCategories.list')

  // The draft resets to the applied search whenever that changes (render-time sync).
  const [draft, setDraft] = React.useState({ for: search, text: search })
  if (draft.for !== search) setDraft({ for: search, text: search })

  return (
    <Card className="flex flex-col gap-4 p-4">
      <SearchWithButton
        value={draft.text}
        onValueChange={(text) => setDraft((d) => ({ ...d, text }))}
        onSubmit={onSearch}
        placeholder={t('searchPlaceholder')}
        buttonLabel={t('searchButton')}
        label={t('searchLabel')}
      />
      <Select value={status || ALL} onValueChange={(value) => onStatusChange(value === ALL ? '' : value)}>
        {/* Half the card's width from `sm`, as measured on the screenshot (full width on phones). */}
        <SelectTrigger size="lg" aria-label={t('statusLabel')} className="sm:w-1/2">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t('allStatuses')}</SelectItem>
          <SelectItem value="active">{t('active')}</SelectItem>
          <SelectItem value="inactive">{t('inactive')}</SelectItem>
        </SelectContent>
      </Select>
    </Card>
  )
}
