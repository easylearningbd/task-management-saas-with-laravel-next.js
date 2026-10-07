'use client'

import * as React from 'react'
import { useFormatter } from 'next-intl'
import { useHydrated } from '@/lib/use-hydrated'

/* "4 months ago" (design/user-dashboard, Recent Tasks) — next-intl's relativeTime picks the
   unit. The distance depends on the viewer's clock, so it renders after hydration only
   (the server's clock is not the viewer's); before that the <time> is empty but keeps its
   machine-readable dateTime. The exact date and time is the hover title. */
export function RelativeTime({ iso, className }: { iso: string; className?: string }) {
  const format = useFormatter()
  const hydrated = useHydrated()
  const [now] = React.useState(() => Date.now())
  const date = new Date(iso)
  const valid = !Number.isNaN(date.getTime())

  return (
    <time
      dateTime={iso}
      className={className}
      title={hydrated && valid ? format.dateTime(date, { dateStyle: 'medium', timeStyle: 'short' }) : undefined}
    >
      {hydrated && valid ? format.relativeTime(date, now) : null}
    </time>
  )
}
