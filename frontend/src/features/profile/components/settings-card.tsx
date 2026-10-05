import * as React from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/cn'

/* A settings section card as in the Profile Settings screenshot: Card.md's panel with
   `card-padding`, a `title-section` (18px/600) heading and a `body` muted subtitle 8px under
   it. The section id is the scroll target for the left nav; `scroll-mt-20` keeps the heading
   clear of the sticky top bar. */
export function SettingsCard({
  id,
  title,
  subtitle,
  children,
  className,
}: {
  id: string
  title: string
  subtitle: string
  children: React.ReactNode
  className?: string
}) {
  const headingId = `${id}-heading`

  return (
    // tabIndex -1: the left nav moves focus here (not a tab stop); no ring on the whole card.
    <Card
      id={id}
      role="region"
      aria-labelledby={headingId}
      tabIndex={-1}
      className={cn('scroll-mt-20 p-card focus:outline-none', className)}
    >
      <h2 id={headingId} className="text-title-section">
        {title}
      </h2>
      <p className="mt-2 text-body text-muted-foreground">{subtitle}</p>
      {children}
    </Card>
  )
}
