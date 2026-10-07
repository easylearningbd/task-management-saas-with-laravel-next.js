/* Dates follow brand-book.md (YYYY-MM-DD) in the viewer's time zone. Anything that depends on
   the viewer's clock or zone must render only after hydration (useHydrated) — the server's
   zone and clock are not the viewer's. */

const pad = (n: number) => String(n).padStart(2, '0')

const DAY_MS = 24 * 60 * 60 * 1000

/** ISO timestamp → "2026-04-14" in the viewer's time zone. */
export function formatDate(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** ISO timestamp → "2026-04-14 09:30" in the viewer's time zone. */
export function formatDateTime(iso: string | null): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return `${formatDate(iso)} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/**
 * Where a deadline stands from `now`: `past` once it has passed, else the number of calendar
 * days left in the viewer's zone (0 = later today). null for a missing or invalid date.
 */
export function deadline(iso: string | null, now: number): { past: true } | { past: false; days: number } | null {
  if (!iso) return null
  const at = new Date(iso)
  if (Number.isNaN(at.getTime())) return null
  if (at.getTime() <= now) return { past: true }
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  return { past: false, days: Math.round((startOfDay(at) - startOfDay(new Date(now))) / DAY_MS) }
}

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const

/** 0 → "0 B", 1536 → "1.5 KB", 5368709120 → "5 GB" (1024-based, like the plan's GB limit). */
export function formatBytes(bytes: number): string {
  let value = Math.max(0, bytes)
  let unit = 0
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024
    unit += 1
  }
  const rounded = unit === 0 ? value : Math.round(value * 10) / 10
  return `${rounded} ${BYTE_UNITS[unit]}`
}

/** GB (the plan's 2-decimal string) → bytes, 1024-based. */
export function gigabytesToBytes(gb: string): number {
  return Number(gb) * 1024 ** 3
}
