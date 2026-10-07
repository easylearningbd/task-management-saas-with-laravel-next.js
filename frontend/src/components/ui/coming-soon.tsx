'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Tooltip } from '@/components/ui/tooltip'
import { cn } from '@/lib/cn'

/* A control whose destination isn't built yet (unbuilt menu items, the Start timer, Upgrade,
   "View all"): it stays in the layout so the screen reads as designed, but at
   `opacity-disabled` with a not-allowed cursor, `aria-disabled`, and a "Coming soon"
   tooltip. It stays focusable — keyboard users reach it and hear why it does nothing — and
   every click is swallowed, so nothing can land on a 404.
   Pass a single <button> (never a <Link>: its own navigation would run first). */

type Child = React.ReactElement<{
  className?: string
  onClick?: (event: React.MouseEvent) => void
  'aria-disabled'?: boolean
}>

export function ComingSoon({
  children,
  label,
  side,
}: {
  children: Child
  label?: string
  side?: React.ComponentProps<typeof Tooltip>['side']
}) {
  const t = useTranslations('shared')
  const text = label ?? t('comingSoon')

  return (
    <Tooltip content={text} side={side}>
      {React.cloneElement(children, {
        'aria-disabled': true,
        className: cn(children.props.className, 'cursor-not-allowed opacity-disabled'),
        onClick: (event: React.MouseEvent) => event.preventDefault(),
      })}
    </Tooltip>
  )
}
