import { cn } from '@/lib/cn'
import { colorFromString, PALETTE_CLASSES } from '@/lib/color-from-string'

/* design-system/components/Avatar.md — a `radius-full` circle at `avatar-size`.
   Photo when there is one; otherwise one or two initials at 13px/600 on a soft ground from
   the stat palette, picked by hashing the record id so a person keeps their color.
   `colorKey` hashes a string instead (lib/color-from-string) — the colour then matches every
   ColorBadge showing the same value; `initials` overrides the derived letters (e.g. letters the
   API computed with another rule); `outlined` adds the hairline in the avatar's own colour drawn
   on the list screenshots (Badge's `outlined`, approved). */

const TONES = [
  'bg-primary-soft text-primary-strong',
  'bg-info-soft text-info',
  'bg-stat-violet text-stat-violet-label',
  'bg-stat-indigo text-stat-indigo-label',
  'bg-stat-amber text-stat-amber-label',
] as const

/** First letters of the first two words ("Tech Solutions Inc" → "TS"), or the first two
 *  letters of a single word ("Company" → "CO") — the convention in the dashboard designs. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  const letters = words.length > 1 ? words[0][0] + words[1][0] : (words[0] ?? '?').slice(0, 2)
  return letters.toUpperCase()
}

function toneIndex(seed: number): number {
  return Math.abs(seed) % TONES.length
}

/* default: `avatar-size` (36px) with 13px/600 initials (Avatar.md).
   lg: 80px for a profile header (the Profile Settings screenshot), initials at `title-section`. */
// sm 28px / md 48px: Avatar.md's variants "for dense rows and detail headers".
const SIZES = {
  // 20px: the counterpart chip in design/user-dashboard's Recent Contracts rows (9px/600 initials).
  xs: 'size-5 text-[9px] font-semibold',
  sm: 'size-7 text-[11px] font-semibold',
  default: 'size-avatar text-[13px] font-semibold',
  // 40px: the identity cell in the Companies screenshot's table rows.
  row: 'size-10 text-[13px] font-semibold',
  md: 'size-12 text-[15px] font-semibold',
  lg: 'size-20 text-title-section',
} as const

export function Avatar({
  name,
  seed = 0,
  colorKey,
  initials,
  src,
  size = 'default',
  muted = false,
  outlined = false,
  className,
}: {
  name: string
  /** Stable value (e.g. the user id) that picks the tone. */
  seed?: number
  /** A string to hash for the colour instead of `seed` (same value → same colour as ColorBadge). */
  colorKey?: string
  /** Letters to show instead of the ones derived from `name`. */
  initials?: string
  src?: string | null
  size?: keyof typeof SIZES
  /** Neutral `muted` ground instead of a hue — a secondary party, e.g. a contract's counterpart. */
  muted?: boolean
  /** A 1px ring in the avatar's own colour at 20%. */
  outlined?: boolean
  className?: string
}) {
  const tone = muted
    ? 'bg-muted text-muted-foreground'
    : colorKey !== undefined
      ? PALETTE_CLASSES[colorFromString(colorKey)].soft
      : TONES[toneIndex(seed)]

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        SIZES[size],
        tone,
        outlined && 'border border-current/20',
        className,
      )}
      aria-hidden="true"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- user uploads come from the API host
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        (initials ?? initialsOf(name))
      )}
    </span>
  )
}
