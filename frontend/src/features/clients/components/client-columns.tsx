'use client'

import * as React from 'react'
import { ExternalLink } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { DataTableColumn } from '@/components/shared/data-table'
import { IdentityCell } from '@/components/shared/identity-cell'
import { RowActions, type RowAction } from '@/components/shared/row-actions'
import { Badge } from '@/components/ui/badge'
import { ColorBadge } from '@/components/ui/color-badge'
import { Skeleton } from '@/components/ui/skeleton'
import type { Client, ClientSortKey } from '@/features/clients/types'

/* The Clients table, in the screenshot's order. Columns size to their content; below `2xl`
   (1536px) name, company and website are capped so all seven columns fit a 1440px screen
   without scrolling — long values truncate with an ellipsis (full text in the title), as the
   screenshot does with "www.digitalmarketingpro.c…"; from `2xl` up they get the room it shows:
   # (DataTable) · Name ↕ (initials avatar + name + email) · Phone · Company · Website · Status ·
   Actions. Only Name carries a sort control, as drawn; the other whitelisted sorts (email,
   company, status, created) stay reachable through the URL.
   Company and Website are ColorBadges — the colour comes from the value, so it is the same on
   every page and after every reload. The avatar is coloured by the client's name. Status:
   `success` "Active" / `danger` "Inactive" (screenshot, Phase 0 decision 2). */

export function useClientColumns(actionsFor: (client: Client) => RowAction[]): DataTableColumn<Client, ClientSortKey>[] {
  const t = useTranslations('clients.list')

  return React.useMemo<DataTableColumn<Client, ClientSortKey>[]>(
    () => [
      {
        id: 'name',
        header: t('columns.name'),
        sortKey: 'name',
        cell: (client) => (
          <IdentityCell
            name={client.name}
            secondary={client.email}
            initials={client.initials}
            colorKey={client.name}
            outlined
            size="row"
            className="max-w-48 2xl:max-w-none"
          />
        ),
        skeleton: (
          <span className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <span className="space-y-1.5">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40" />
            </span>
          </span>
        ),
      },
      {
        id: 'phone',
        header: t('columns.phone'),
        className: 'whitespace-nowrap',
        cell: (client) => client.phone,
        skeleton: <Skeleton className="h-4 w-28" />,
      },
      {
        id: 'company',
        header: t('columns.company'),
        cell: (client) => <ColorBadge className="max-w-32 2xl:max-w-52">{client.company_name}</ColorBadge>,
        skeleton: <Skeleton className="h-6 w-20" />,
      },
      {
        id: 'website',
        header: t('columns.website'),
        cell: (client) => <WebsiteBadge client={client} />,
        skeleton: <Skeleton className="h-6 w-32" />,
      },
      {
        id: 'status',
        header: t('columns.status'),
        cell: (client) => <ClientStatusBadge client={client} />,
        skeleton: <Skeleton className="h-6 w-14" />,
      },
      {
        id: 'actions',
        header: t('columns.actions'),
        align: 'right',
        cell: (client) => <RowActions actions={actionsFor(client)} />,
        skeleton: (
          <span className="inline-flex gap-1.5">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="size-control-sm rounded-lg" />
            ))}
          </span>
        ),
      },
    ],
    [t, actionsFor],
  )
}

/** The website as a coloured link badge (host + external-link glyph), or "-". */
export function WebsiteBadge({ client }: { client: Pick<Client, 'website' | 'website_host'> }) {
  const t = useTranslations('clients.list')
  if (!client.website || !client.website_host) return <span className="text-muted-foreground">{t('noValue')}</span>
  return (
    <ColorBadge
      colorKey={client.website_host}
      icon={ExternalLink}
      href={client.website}
      label={t('websiteLink', { host: client.website_host })}
      className="max-w-36 2xl:max-w-60"
    >
      {client.website_host}
    </ColorBadge>
  )
}

export function ClientStatusBadge({ client }: { client: Pick<Client, 'status' | 'status_label'> }) {
  return (
    <Badge tone={client.status === 'active' ? 'success' : 'danger'} outlined>
      {client.status_label}
    </Badge>
  )
}
