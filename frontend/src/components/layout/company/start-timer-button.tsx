'use client'

import { Play } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ComingSoon } from '@/components/ui/coming-soon'

/* The top bar's Start button (company only, PRD §4; design/user-dashboard shell-config.tsx
   `StartButton`): an outline `control-height` button with a `primary`-filled Play glyph.
   "Coming soon" until the Time Tracker ships (one running session per user, CLAUDE.md §8).
   Below `sm` the word hides and the glyph carries the button (it keeps its aria-label). */
export function StartTimerButton() {
  const t = useTranslations('companyShell')

  return (
    <ComingSoon>
      <button
        type="button"
        aria-label={t('startLabel')}
        className="inline-flex h-control shrink-0 items-center gap-2 rounded-lg border border-border bg-card px-3 text-body font-medium shadow-sm transition-colors focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none"
      >
        <Play className="size-icon fill-primary text-primary" strokeWidth={1.75} aria-hidden="true" />
        <span className="max-sm:hidden">{t('start')}</span>
      </button>
    </ComingSoon>
  )
}
