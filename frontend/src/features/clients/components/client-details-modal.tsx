'use client'

import * as React from 'react'
import { Building2, Calendar, Globe, Lock, Mail, MapPin, Phone, StickyNote, User } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { DetailsModal, type DetailItem } from '@/components/shared/details-modal'
import { useClient } from '@/features/clients/api'
import { ClientStatusBadge } from '@/features/clients/components/client-columns'
import type { Client } from '@/features/clients/types'
import { formatDate } from '@/features/companies/format'

/* The eye icon's read-only view — PAGE SPEC C and the Client Details screenshot: the 672px
   DetailsModal (Phase 0 decision 4) with the soft-green `User` tile, a rule under the header
   and only the × to close. Two labelled columns, each label behind a muted icon:
     Client Name (User) · Email (Mail) / Phone (Phone) · Company (Building2) /
     Website (Globe, a blue link, new tab) · Status (Lock, the badge) /
     Address (MapPin, full width) / [Notes (StickyNote, full width) — only when present] /
     Created At (Calendar, full width, YYYY-MM-DD in the viewer's zone)
   An empty Website reads a muted "-". Opens instantly from the row, then refreshes from
   GET /clients/{id}. */
export function ClientDetailsModal({
  open,
  onOpenChange,
  client,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  client: Client | null
}) {
  const t = useTranslations('clients.details')
  const tList = useTranslations('clients.list')
  const detail = useClient(client?.id ?? null, { enabled: open, initialData: client ?? undefined })
  const shown = detail.data ?? client

  const items = React.useMemo<DetailItem[]>(() => {
    if (!shown) return []
    const createdAt = formatDate(shown.created_at)
    return [
      { id: 'name', label: t('name'), icon: User, value: shown.name },
      { id: 'email', label: t('email'), icon: Mail, value: shown.email },
      { id: 'phone', label: t('phone'), icon: Phone, value: shown.phone },
      { id: 'company', label: t('company'), icon: Building2, value: shown.company_name },
      {
        id: 'website',
        label: t('website'),
        icon: Globe,
        value: shown.website ? (
          <a
            href={shown.website}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={tList('websiteLink', { host: shown.website_host ?? shown.website })}
            className="rounded-sm break-all text-info hover:underline focus-visible:shadow-focus focus-visible:outline-none"
          >
            {shown.website}
          </a>
        ) : (
          <span className="text-muted-foreground">{tList('noValue')}</span>
        ),
      },
      { id: 'status', label: t('status'), icon: Lock, value: <ClientStatusBadge client={shown} /> },
      { id: 'address', label: t('address'), icon: MapPin, value: <span className="whitespace-pre-line">{shown.address}</span>, wide: true },
      ...(shown.notes
        ? [{ id: 'notes', label: t('notes'), icon: StickyNote, value: <span className="whitespace-pre-line">{shown.notes}</span>, wide: true }]
        : []),
      {
        id: 'created_at',
        label: t('createdAt'),
        icon: Calendar,
        value: createdAt && shown.created_at ? <time dateTime={shown.created_at}>{createdAt}</time> : null,
        wide: true,
      },
    ]
  }, [shown, t, tList])

  return (
    <DetailsModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('title')}
      icon={User}
      items={items}
      size="md"
      divided
      footer={false}
    />
  )
}
