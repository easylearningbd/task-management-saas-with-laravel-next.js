'use client'

import * as React from 'react'
import { CreditCard, ExternalLink } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { DetailsModal, type DetailItem } from '@/components/shared/details-modal'
import { formatDateTime } from '@/features/companies/format'
import { PlanNameBadge, PlanOrderStatusBadge } from '@/features/billing/components/plan-order-columns'
import { usePlanOrder } from '@/features/billing/api'
import type { PlanOrder } from '@/features/billing/types'
import { useMoney } from '@/lib/format-money'

/* A Plan Requests row's read-only view (PAGE SPEC C): the DetailsModal sheet with the order code
   (`font-mono`, a machine string — brand-book.md), type, plan, duration, amount (`money`), payment
   method, reference, the receipt (a link to the authorised receipt route, in a new tab — the
   session cookie goes with it, as with Media files), notes, status, requested and reviewed dates,
   and the rejection reason when rejected. Header glyph: `CreditCard`, the Plans icon in the
   sidebar. Opens instantly from the row, then refreshes from GET /plan-orders/{id}; keeps its
   record while it animates closed. */
export function PlanOrderDetailsModal({
  open,
  onOpenChange,
  order,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: PlanOrder | null
}) {
  const t = useTranslations('billing.requests.details')
  const money = useMoney()
  const detail = usePlanOrder(order?.id ?? null, { initialData: order ?? undefined })
  const shown = detail.data ?? order

  const items = React.useMemo<DetailItem[]>(() => {
    if (!shown) return []
    const dateTime = (iso: string | null) => {
      const text = formatDateTime(iso)
      return text && iso ? <time dateTime={iso}>{text}</time> : null
    }
    const list: DetailItem[] = [
      { id: 'order_code', label: t('orderCode'), value: <span className="font-mono">{shown.order_code}</span> },
      { id: 'type', label: t('type'), value: shown.type_label },
      { id: 'plan', label: t('plan'), value: shown.plan ? <PlanNameBadge name={shown.plan.name} /> : null },
      { id: 'duration', label: t('duration'), value: shown.duration_label },
      { id: 'amount', label: t('amount'), value: <span className="font-mono text-money">{money(shown.final_amount)}</span> },
      { id: 'payment_method', label: t('paymentMethod'), value: shown.payment_method_label },
      { id: 'reference', label: t('reference'), value: shown.payment_reference },
      {
        id: 'receipt',
        label: t('receipt'),
        value:
          shown.has_receipt && shown.receipt_url ? (
            <a
              href={shown.receipt_url}
              target="_blank"
              // No `noreferrer`: Sanctum recognises the app by the Referer to send the session.
              rel="noopener"
              aria-label={t('viewReceiptLabel', { name: shown.receipt_name ?? shown.order_code })}
              className="inline-flex max-w-full items-center gap-1.5 rounded-sm font-medium text-primary-strong hover:underline focus-visible:shadow-focus focus-visible:outline-none"
            >
              <span className="truncate">{shown.receipt_name ?? t('viewReceipt')}</span>
              <ExternalLink className="size-icon shrink-0" aria-hidden="true" />
            </a>
          ) : null,
      },
      { id: 'status', label: t('status'), value: <PlanOrderStatusBadge order={shown} /> },
      { id: 'requested_at', label: t('requestedAt'), value: dateTime(shown.created_at) },
      {
        id: 'reviewed_at',
        label: t('reviewedAt'),
        value: dateTime(shown.reviewed_at) ?? (shown.status === 'pending' ? <span className="text-muted-foreground">{t('notReviewed')}</span> : null),
      },
      { id: 'notes', label: t('notes'), value: shown.notes ? <span className="whitespace-pre-line">{shown.notes}</span> : null, wide: true },
    ]
    if (shown.status === 'rejected') {
      list.push({
        id: 'rejection_reason',
        label: t('rejectionReason'),
        value: shown.rejection_reason ? <span className="whitespace-pre-line text-danger">{shown.rejection_reason}</span> : null,
        wide: true,
      })
    }
    return list
  }, [shown, t, money])

  return <DetailsModal open={open} onOpenChange={onOpenChange} title={t('title')} icon={CreditCard} items={items} />
}
