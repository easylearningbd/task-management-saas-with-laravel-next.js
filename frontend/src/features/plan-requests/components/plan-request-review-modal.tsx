'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { CreditCard } from 'lucide-react'
import { DetailList, type DetailItem } from '@/components/shared/detail-list'
import { DetailsModal } from '@/components/shared/details-modal'
import { IdentityCell } from '@/components/shared/identity-cell'
import { ReceiptPreview } from '@/components/shared/receipt-preview'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { PlanNameBadge, PlanOrderStatusBadge } from '@/features/billing/components/plan-order-columns'
import { formatDate, formatDateTime } from '@/features/companies/format'
import { useAdminPlanOrder, useApprovePlanOrder } from '@/features/plan-requests/api'
import type { AdminPlanOrder } from '@/features/plan-requests/types'
import { toApiError } from '@/lib/api-error'
import { useMoney } from '@/lib/format-money'

/* ✓ — Review & Approve (task PAGE SPEC A), and the read-only view of a reviewed order (a row click).
   The DetailsModal sheet: the order code as the title with its status badge; the company (avatar,
   name, email); the order's fields on DetailList (type, plan, duration, amount in `money`, payment
   method, reference, requested at; reviewed by / at once reviewed; notes and the rejection reason
   across the full width); then the Payment Receipt (ReceiptPreview — an image inline, a PDF as a
   labelled link, "No receipt attached" for a request or a free plan), from the admin receipt route.
   While pending: an `info` line saying what approving does — "{Company} will move to {Plan}
   ({Duration}), valid until {date}." — the date is the server's `approval.expires_at`, computed by
   the very function the approval runs (a $0 plan: "with no expiry date"); the footer is Cancel +
   the green Approve (spinner while saving; nothing closes meanwhile). A refusal (e.g. another admin
   reviewed it first) shows in a `danger` alert, and the order refreshes to its real state.
   Reviewed: Close only. Opens instantly from the row, then refreshes from GET …/{id}; keeps its
   record while it animates closed. */
export function PlanRequestReviewModal({
  open,
  onOpenChange,
  order,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: AdminPlanOrder | null
}) {
  const t = useTranslations('planRequests.review')
  const money = useMoney()
  const detail = useAdminPlanOrder(order?.id ?? null, { initialData: order ?? undefined })
  const approve = useApprovePlanOrder()
  const [error, setError] = React.useState<string | null>(null)
  const shown = detail.data ?? order
  const pending = shown?.status === 'pending'

  // A fresh error state for every order the modal opens on.
  const [openedFor, setOpenedFor] = React.useState<number | null>(null)
  if (open && order && openedFor !== order.id) {
    setOpenedFor(order.id)
    setError(null)
  }

  const items = React.useMemo<DetailItem[]>(() => {
    if (!shown) return []
    const dateTime = (iso: string | null) => {
      const text = formatDateTime(iso)
      return text && iso ? <time dateTime={iso}>{text}</time> : null
    }
    const list: DetailItem[] = [
      { id: 'type', label: t('type'), value: shown.type_label },
      { id: 'plan', label: t('plan'), value: shown.plan ? <PlanNameBadge name={shown.plan.name} /> : null },
      { id: 'duration', label: t('duration'), value: shown.duration_label },
      { id: 'amount', label: t('amount'), value: <span className="font-mono text-money">{money(shown.final_amount)}</span> },
      { id: 'payment_method', label: t('paymentMethod'), value: shown.payment_method_label },
      { id: 'reference', label: t('reference'), value: shown.payment_reference },
      { id: 'requested_at', label: t('requestedAt'), value: dateTime(shown.created_at) },
    ]
    if (shown.status !== 'pending') {
      list.push(
        { id: 'reviewed_by', label: t('reviewedBy'), value: shown.reviewer?.name ?? null },
        { id: 'reviewed_at', label: t('reviewedAt'), value: dateTime(shown.reviewed_at) },
      )
    }
    list.push({ id: 'notes', label: t('notes'), value: shown.notes ? <span className="whitespace-pre-line">{shown.notes}</span> : null, wide: true })
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

  const summary = (() => {
    if (!shown || !pending || !shown.approval || !shown.company || !shown.plan) return null
    const values = { company: shown.company.name, plan: shown.plan.name, duration: shown.duration_label }
    const date = formatDate(shown.approval.expires_at)
    return date ? t('summary', { ...values, date }) : t('summaryNoExpiry', values)
  })()

  const onApprove = () => {
    if (!shown) return
    setError(null)
    approve.mutate(shown.id, {
      onSuccess: (approved) => {
        toast.success(t('approved', { company: approved.company?.name ?? '', plan: approved.plan?.name ?? '' }))
        onOpenChange(false)
      },
      onError: (failure) => {
        const apiError = toApiError(failure)
        setError(Object.values(apiError.fieldErrors)[0] ?? apiError.message ?? t('failed'))
      },
    })
  }

  return (
    <DetailsModal
      open={open}
      onOpenChange={(next) => {
        if (!approve.isPending) onOpenChange(next)
      }}
      title={shown?.order_code ?? ''}
      icon={CreditCard}
      badge={shown ? <PlanOrderStatusBadge order={shown} /> : null}
      closeLabel={pending ? t('cancel') : undefined}
      closeDisabled={approve.isPending}
      actions={
        pending ? (
          <Button onClick={onApprove} loading={approve.isPending}>
            {t('approve')}
          </Button>
        ) : null
      }
    >
      {shown ? (
        <div className="flex flex-col gap-5">
          {error ? <Alert tone="danger">{error}</Alert> : null}
          {shown.company ? (
            <div>
              <p className="mb-2 text-body-sm text-muted-foreground">{t('company')}</p>
              <IdentityCell name={shown.company.name} secondary={shown.company.email} seed={shown.company.id} avatarSrc={shown.company.avatar_url} size="row" />
            </div>
          ) : null}
          <DetailList items={items} />
          <div>
            <p className="mb-2 text-body-sm text-muted-foreground">{t('receipt')}</p>
            <ReceiptPreview url={shown.receipt_url} name={shown.receipt_name} />
          </div>
          {summary ? <Alert tone="info">{summary}</Alert> : null}
        </div>
      ) : null}
    </DetailsModal>
  )
}
