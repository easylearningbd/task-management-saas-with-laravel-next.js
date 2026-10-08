import * as React from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { colorFromString, PALETTE_CLASSES } from '@/lib/color-from-string'

/* A soft badge whose colour comes from its value (lib/color-from-string) — design-system/
   components/Badge.md's pill (24px, `radius-md`, 10px side padding, `badge` text, soft ground
   + its own text colour) with Badge's approved `outlined` hairline in its own colour at 20%,
   as on the list screenshots' coloured name and link columns. The same value always gets the
   same colour, everywhere.
   Link mode (`href`): opens in a new tab with rel="noopener noreferrer", underlines on hover
   and shows the focus ring. A trailing icon (e.g. ExternalLink) is 14px, as Badge's chips.
   Long values truncate with an ellipsis at the width cap passed in `className` (`max-w-…`);
   the full text is the title. */
export function ColorBadge({
  children,
  colorKey,
  icon: Icon,
  href,
  label,
  className,
}: {
  /** The visible text. */
  children: string
  /** The value that picks the colour; defaults to the text. */
  colorKey?: string
  /** Trailing glyph. */
  icon?: LucideIcon
  /** Makes the badge a link that opens in a new tab. */
  href?: string
  /** Accessible name for link mode, e.g. "microsoft.com (opens in a new tab)". */
  label?: string
  /** Width cap etc. (`max-w-…`). */
  className?: string
}) {
  const classes = cn(
    'inline-flex h-6 max-w-full items-center gap-1 rounded-md border border-current/20 px-2.5 text-badge whitespace-nowrap',
    PALETTE_CLASSES[colorFromString(colorKey ?? children)].soft,
    href && 'transition-[text-decoration-color] hover:underline focus-visible:shadow-focus focus-visible:outline-none',
    className,
  )
  const content = (
    <>
      <span className="truncate">{children}</span>
      {Icon ? <Icon className="size-3.5 shrink-0" aria-hidden="true" /> : null}
    </>
  )

  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" title={children} aria-label={label} className={classes}>
      {content}
    </a>
  ) : (
    <span title={children} className={classes}>
      {content}
    </span>
  )
}
