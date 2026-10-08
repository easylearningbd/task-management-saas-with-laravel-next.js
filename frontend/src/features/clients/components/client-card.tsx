'use client'

import * as React from 'react'
import { GridCard } from '@/components/shared/card-grid'
import { IdentityCell } from '@/components/shared/identity-cell'
import { RowActions, type RowAction } from '@/components/shared/row-actions'
import { ColorBadge } from '@/components/ui/color-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { ClientStatusBadge, WebsiteBadge } from '@/features/clients/components/client-columns'
import type { Client } from '@/features/clients/types'

/* One client in the grid view (no screenshot — inferred, PAGE SPEC A): the table row's data on
   a Card.md surface — the 48px initials avatar with name and email, the phone, the company,
   website and status badges, and the same four actions under a 1px rule. Same colours as the
   table: they come from the values, not the position. */
export function ClientCard({ client, actions }: { client: Client; actions: RowAction[] }) {
  return (
    <GridCard className="flex flex-col">
      <IdentityCell
        name={client.name}
        secondary={client.email}
        initials={client.initials}
        colorKey={client.name}
        outlined
        size="md"
      />
      <p className="mt-3 text-body-sm text-muted-foreground">{client.phone}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ColorBadge className="max-w-full">{client.company_name}</ColorBadge>
        <WebsiteBadge client={client} />
        <ClientStatusBadge client={client} />
      </div>
      <div className="mt-auto pt-4">
        <div className="-mx-card -mb-card border-t border-border px-card py-3">
          <RowActions actions={actions} className="flex w-full flex-wrap justify-between" />
        </div>
      </div>
    </GridCard>
  )
}

export function ClientCardSkeleton() {
  return (
    <GridCard aria-hidden="true" className="flex flex-col">
      <div className="flex items-center gap-3">
        <Skeleton className="size-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
      <Skeleton className="mt-3 h-4 w-28" />
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-28" />
        <Skeleton className="h-6 w-14" />
      </div>
      <div className="-mx-card -mb-card mt-4 flex justify-between border-t border-border px-card py-3">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="size-control-sm rounded-lg" />
        ))}
      </div>
    </GridCard>
  )
}
