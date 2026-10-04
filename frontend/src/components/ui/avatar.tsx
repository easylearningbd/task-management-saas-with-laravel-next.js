import { cn } from '@/lib/cn'

/* design-system/components/Avatar.md — a `radius-full` circle at `avatar-size`.
   Photo when there is one; otherwise one or two initials at 13px/600 on a soft ground from
   the stat palette, picked by hashing the record id so a person keeps their color. */

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

export function Avatar({
  name,
  seed,
  src,
  className,
}: {
  name: string
  /** Stable value (e.g. the user id) that picks the tone. */
  seed: number
  src?: string | null
  className?: string
}) {
  return (
    <span
      className={cn(
        'relative inline-flex size-avatar shrink-0 items-center justify-center overflow-hidden rounded-full text-[13px] font-semibold',
        TONES[toneIndex(seed)],
        className,
      )}
      aria-hidden="true"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- user uploads come from the API host
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        initialsOf(name)
      )}
    </span>
  )
}
