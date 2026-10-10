'use client'

import * as React from 'react'
import { CircleAlert, Plus, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Card, CardHeading } from '@/components/ui/card'
import { Tooltip } from '@/components/ui/tooltip'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { toApiError } from '@/lib/api-error'

/* The frame every project tab list shares (Milestones, Project Items, Notes, …): Card.md's
   surface with the divided heading (`title-card` left, a green "+ Add …" on the right), then
   one body: the caller's skeleton while the list loads, a `danger` EmptyState with Try again if
   it fails, an EmptyState with the same Add action when there is nothing yet, else the list.
   Project Files' variant (its screenshot): `titleIcon` puts a 16px `muted-foreground` glyph
   beside the title, and `addIconOnly` makes the heading's Add a square `control-height-sm`
   primary icon button (the label becomes its aria-label and tooltip). */

type ListQuery = { isPending: boolean; isError: boolean; error: unknown; refetch: () => unknown }

export function TabCard({
  title,
  addLabel,
  onAdd,
  query,
  isEmpty,
  empty,
  skeleton,
  children,
  titleIcon: TitleIcon,
  addIconOnly = false,
}: {
  title: string
  addLabel: string
  onAdd: () => void
  query: ListQuery
  isEmpty: boolean
  empty: { icon: LucideIcon; title: string; description: string }
  skeleton: React.ReactNode
  children: React.ReactNode
  /** A small glyph beside the title (Project Files' upload icon). */
  titleIcon?: LucideIcon
  /** The heading's Add as a square icon button (Project Files' "+"). */
  addIconOnly?: boolean
}) {
  const t = useTranslations('projects.details')

  const addButton = (size?: 'sm') => (
    <Button size={size} onClick={onAdd}>
      <Plus className="size-icon" aria-hidden="true" />
      {addLabel}
    </Button>
  )

  let body: React.ReactNode
  if (query.isPending) {
    body = skeleton
  } else if (query.isError) {
    body = (
      <EmptyState
        icon={CircleAlert}
        tone="danger"
        title={t('tabError')}
        description={toApiError(query.error).message}
        action={
          <Button variant="outline" onClick={() => query.refetch()}>
            {t('error.retry')}
          </Button>
        }
      />
    )
  } else if (isEmpty) {
    body = <EmptyState icon={empty.icon} title={empty.title} description={empty.description} action={addButton()} />
  } else {
    body = children
  }

  const headingAction = addIconOnly ? (
    <Tooltip content={addLabel}>
      <Button size="icon-sm" aria-label={addLabel} onClick={onAdd}>
        <Plus className="size-icon" aria-hidden="true" />
      </Button>
    </Tooltip>
  ) : (
    addButton('sm')
  )

  return (
    <Card>
      {TitleIcon ? (
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-card py-4.5">
          <h2 className="flex min-w-0 items-center gap-2 text-title-card">
            <span className="truncate">{title}</span>
            <TitleIcon className="size-icon shrink-0 text-muted-foreground" aria-hidden="true" />
          </h2>
          <div className="flex shrink-0 items-center gap-3">{headingAction}</div>
        </div>
      ) : (
        <CardHeading divided title={title} action={headingAction} />
      )}
      {body}
    </Card>
  )
}

/** Two-column tile placeholders (Items and Notes). */
export function TileGridSkeleton() {
  return (
    <ul aria-hidden="true" className="grid grid-cols-1 gap-4 p-card md:grid-cols-2">
      {Array.from({ length: 4 }, (_, i) => (
        <li key={i} className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex justify-between gap-3">
            <Skeleton className="h-5 w-2/5" />
            <div className="flex gap-1.5">
              <Skeleton className="size-control-sm rounded-lg" />
              <Skeleton className="size-control-sm rounded-lg" />
            </div>
          </div>
          <Skeleton className="h-4 w-3/4" />
          <div className="flex justify-between">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-5 w-20" />
          </div>
        </li>
      ))}
    </ul>
  )
}
