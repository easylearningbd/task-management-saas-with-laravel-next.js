'use client'

import * as React from 'react'
import { Calendar } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { DataTableColumn } from '@/components/shared/data-table'
import { IdentityCell } from '@/components/shared/identity-cell'
import { RowActions, type RowAction } from '@/components/shared/row-actions'
import { Badge } from '@/components/ui/badge'
import { ColorBadge } from '@/components/ui/color-badge'
import { Skeleton } from '@/components/ui/skeleton'
import { CreatedDate } from '@/features/companies/components/company-columns'
import type { InvoiceListItem, InvoiceSortKey, InvoiceStatus } from '@/features/invoices/types'
import { useMoney } from '@/lib/format-money'
import { cn } from '@/lib/cn'

/* The Invoices table, in the screenshot's order:
   # (DataTable) · Invoice Number ↕ (an outlined `info` badge) · Client (initials avatar coloured by
   the name, name, email) · Project (a ColorBadge — its colour from the name, the same on every
   page) · Invoice Date ↕ (Calendar, `muted-foreground-alt`) · Due Date ↕ (the same, or `danger`
   with a small "overdue" beneath when past due with money owed) · Total Amount ↕ (`money`) ·
   Balance Due ↕ (`money`: `success` $0.00 when paid, `warning` when partial, default otherwise) ·
   Status (outlined: Paid `success` · Partial `warning` · Sent `info` · Draft `neutral`) · Actions
   (the eye always; the pencil and trash only for Draft and Sent — `can_edit`). Money is the
   server's string, formatted.
   Width: ten columns need ~1,300px; below `2xl` the client and project cells are capped (full text in
   the title) as on the Clients page, and what still doesn't fit scrolls inside the table card
   (DataTable's narrow-screen behaviour) — at 1440px the last columns are reached by scrolling. */

const STATUS_TONE: Record<InvoiceStatus, 'success' | 'warning' | 'info' | 'neutral'> = {
  paid: 'success',
  partial: 'warning',
  sent: 'info',
  draft: 'neutral',
}

export function InvoiceStatusBadge({ invoice }: { invoice: Pick<InvoiceListItem, 'status' | 'status_label'> }) {
  return (
    <Badge tone={STATUS_TONE[invoice.status]} outlined>
      {invoice.status_label}
    </Badge>
  )
}

export function InvoiceNumberBadge({ number }: { number: string }) {
  return (
    <Badge tone="info" outlined>
      {number}
    </Badge>
  )
}

/** The due date — `danger` with "overdue" under it when past due with money owed. */
function DueDate({ invoice }: { invoice: InvoiceListItem }) {
  const t = useTranslations('invoices.list')
  if (!invoice.is_overdue) return <CreatedDate iso={invoice.due_date} />
  return (
    <span className="inline-flex flex-col text-danger">
      <span className="inline-flex items-center gap-1.5">
        <Calendar className="size-icon shrink-0" aria-hidden="true" />
        <time dateTime={invoice.due_date}>{invoice.due_date}</time>
      </span>
      <span className="pl-5.5 text-caption">{t('overdue')}</span>
    </span>
  )
}

export function useInvoiceColumns(actionsFor: (invoice: InvoiceListItem) => RowAction[]): DataTableColumn<InvoiceListItem, InvoiceSortKey>[] {
  const t = useTranslations('invoices.list')
  const money = useMoney()

  return React.useMemo<DataTableColumn<InvoiceListItem, InvoiceSortKey>[]>(
    () => [
      {
        id: 'invoice_number',
        header: t('columns.number'),
        sortKey: 'invoice_number',
        cell: (invoice) => <InvoiceNumberBadge number={invoice.invoice_number} />,
        skeleton: <Skeleton className="h-6 w-28" />,
      },
      {
        id: 'client',
        header: t('columns.client'),
        cell: (invoice) =>
          invoice.client ? (
            <IdentityCell
              name={invoice.client.name}
              secondary={invoice.client.email}
              initials={invoice.client.initials}
              colorKey={invoice.client.name}
              outlined
              size="row"
              className="max-w-44 2xl:max-w-64"
            />
          ) : (
            '-'
          ),
        skeleton: (
          <span className="flex items-center gap-3">
            <Skeleton className="size-10 rounded-full" />
            <span className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-36" />
            </span>
          </span>
        ),
      },
      {
        id: 'project',
        header: t('columns.project'),
        cell: (invoice) => (invoice.project ? <ColorBadge className="max-w-32 2xl:max-w-60">{invoice.project.name}</ColorBadge> : '-'),
        skeleton: <Skeleton className="h-6 w-32" />,
      },
      {
        id: 'invoice_date',
        header: t('columns.invoiceDate'),
        sortKey: 'invoice_date',
        cell: (invoice) => <CreatedDate iso={invoice.invoice_date} />,
        skeleton: <Skeleton className="h-4 w-24" />,
      },
      {
        id: 'due_date',
        header: t('columns.dueDate'),
        sortKey: 'due_date',
        cell: (invoice) => <DueDate invoice={invoice} />,
        skeleton: <Skeleton className="h-4 w-24" />,
      },
      {
        id: 'total',
        header: t('columns.total'),
        sortKey: 'total',
        cell: (invoice) => <span className="font-mono text-money font-semibold">{money(invoice.total)}</span>,
        skeleton: <Skeleton className="h-4 w-20" />,
      },
      {
        id: 'balance_due',
        header: t('columns.balance'),
        sortKey: 'balance_due',
        cell: (invoice) => (
          <span className={cn('font-mono text-money', invoice.status === 'paid' && 'text-success', invoice.status === 'partial' && 'text-warning')}>
            {money(invoice.balance_due)}
          </span>
        ),
        skeleton: <Skeleton className="h-4 w-20" />,
      },
      {
        id: 'status',
        header: t('columns.status'),
        cell: (invoice) => <InvoiceStatusBadge invoice={invoice} />,
        skeleton: <Skeleton className="h-6 w-14" />,
      },
      {
        id: 'actions',
        header: t('columns.actions'),
        align: 'right',
        cell: (invoice) => <RowActions actions={actionsFor(invoice)} />,
        skeleton: (
          <span className="inline-flex gap-1.5">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="size-control-sm rounded-lg" />
            ))}
          </span>
        ),
      },
    ],
    [t, money, actionsFor],
  )
}
