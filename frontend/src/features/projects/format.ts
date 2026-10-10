'use client'

import { useHydrated } from '@/lib/use-hydrated'

/* Dates on the project pages follow brand-book.md (YYYY-MM-DD, `muted-foreground-alt` behind a
   Calendar glyph). Plain dates from the API (start, end, due, expense date) are shown as they
   come; a timestamp (created_at) is a moment, so it is shown as the viewer's local day — after
   hydration only, so the server's zone never mismatches the browser's markup. */

const pad = (n: number) => String(n).padStart(2, '0')

/** ISO timestamp → "2026-04-14" in the viewer's zone, once hydrated (null before). */
export function useLocalDate(iso: string | null): string | null {
  const hydrated = useHydrated()
  if (!hydrated || !iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}
