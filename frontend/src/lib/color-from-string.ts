/* Deterministic soft colour for a value (a company name, a website host, a person) — the same
   value always gets the same colour, on every render, page and reload, for every user. Never
   random, never index-based.

   Palette: the five stat hues of the design system (globals.css `--stat-<hue>` ground +
   `--stat-<hue>-label` text). They are the only token pairs that stay readable in light and
   dark AND carry no status meaning (success / warning / danger stay reserved for statuses) —
   an approved palette decision. Hash: 32-bit FNV-1a over the trimmed, lower-cased
   value, so "Microsoft" and " microsoft " match. No imports: this file runs under `node --test`
   as well as in the app. */

export const PALETTE = ['emerald', 'blue', 'violet', 'indigo', 'amber'] as const

export type PaletteColor = (typeof PALETTE)[number]

/** Tailwind classes per colour — literal strings so Tailwind generates them. */
export const PALETTE_CLASSES: Record<PaletteColor, { soft: string; text: string }> = {
  emerald: { soft: 'bg-stat-emerald text-stat-emerald-label', text: 'text-stat-emerald-label' },
  blue: { soft: 'bg-stat-blue text-stat-blue-label', text: 'text-stat-blue-label' },
  violet: { soft: 'bg-stat-violet text-stat-violet-label', text: 'text-stat-violet-label' },
  indigo: { soft: 'bg-stat-indigo text-stat-indigo-label', text: 'text-stat-indigo-label' },
  amber: { soft: 'bg-stat-amber text-stat-amber-label', text: 'text-stat-amber-label' },
}

/** 32-bit FNV-1a — fast, well spread, identical in every JS engine. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** The palette colour for `value` (case- and surrounding-space-insensitive). */
export function colorFromString(value: string): PaletteColor {
  return PALETTE[hashString(value.trim().toLowerCase()) % PALETTE.length]
}
