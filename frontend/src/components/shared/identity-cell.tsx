import * as React from 'react'
import { Avatar } from '@/components/ui/avatar'
import { cn } from '@/lib/cn'

/* The table's identity cell — design-system/components/Avatar.md + Table.md: an avatar paired
   with a two-line block, `title-row` name over a `body-sm` `muted-foreground` secondary line
   (usually the email). The avatar is decorative (alt="" / aria-hidden) — the name carries the
   meaning, so nothing is read twice. Long values truncate instead of widening the column. */
export function IdentityCell({
  name,
  secondary,
  seed,
  avatarSrc,
  size = 'default',
  className,
}: {
  name: string
  secondary?: React.ReactNode
  /** Stable value (e.g. the record id) that picks the initials' ground. */
  seed: number
  avatarSrc?: string | null
  size?: 'sm' | 'default' | 'row' | 'md'
  className?: string
}) {
  return (
    <div className={cn('flex min-w-0 items-center gap-3', className)}>
      <Avatar name={name} seed={seed} src={avatarSrc} size={size} />
      <div className="min-w-0">
        <p className="truncate text-title-row text-foreground">{name}</p>
        {secondary ? <p className="truncate text-body-sm text-muted-foreground">{secondary}</p> : null}
      </div>
    </div>
  )
}
