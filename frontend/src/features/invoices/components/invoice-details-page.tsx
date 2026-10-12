'use client'

import * as React from 'react'
import Link from 'next/link'
import { ArrowLeft, Bell, Calendar, DollarSign, FileText, Pencil, Printer, Send, Trash2 } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PageHeader } from '@/components/layout/app-shell'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { DataTable, type DataTableColumn } from '@/components/shared/data-table'
import { DetailList } from '@/components/shared/detail-list'
import { IdentityCell } from '@/components/shared/identity-cell'
import { QrCode } from '@/components/shared/qr-code'
import { RowActions } from '@/components/shared/row-actions'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardHeading } from '@/components/ui/card'
import { CodeChip } from '@/components/ui/code-chip'
import { ComingSoon } from '@/components/ui/coming-soon'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { CopyButton } from '@/components/ui/copy-button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from '@/components/ui/toast'
import { Tooltip } from '@/components/ui/tooltip'
import { CreatedDate } from '@/features/companies/components/company-columns'
import { useDeletePayment, useInvoice, useInvoiceSettings } from '@/features/invoices/api'
import { isAtMost } from '@/features/invoices/calc'
import { AddPaymentModal } from '@/features/invoices/components/add-payment-modal'
import { BillingDetailsModal } from '@/features/invoices/components/billing-details-modal'
import { InvoiceNumberBadge, InvoiceStatusBadge } from '@/features/invoices/components/invoice-columns'
import { InvoiceNotFound } from '@/features/invoices/components/invoice-form-page'
import type { Invoice, InvoiceLine, InvoicePayment, InvoiceSettings } from '@/features/invoices/types'
import { toApiError } from '@/lib/api-error'
import { useMoney } from '@/lib/format-money'
import { cn } from '@/lib/cn'

/* /invoices/{id} — PAGE SPEC C. Breadcrumb Dashboard › Financial › Invoices › Invoice #{number};
   H1 "Invoice #{number}". Header buttons, left to right: Print (the share page's document, in a new
   tab with its print dialog) · Add Payment ($; disabled with the reason at a zero balance) · Send
   Invoice and Send Reminder (green) — both disabled, "Coming soon" · Copy Link (the public share URL,
   /i/{token}) · Back.
   Two columns from `xl` (stacked below):
   - "Billing & Addresses" (doc tile): Billed From — the company's billing details, with the pencil
     that opens Billing Details — · Billed To — the client, with the status badge — · Project, and
     the QR code of the share URL ("Scan to view online");
   - "Invoice Items": Description | Qty | Unit Price | Total, then the totals bottom-right —
     Subtotal · Discount (red, negative) · Tax (n%) · Total Amount · Paid Amount (green, never
     negative) · Balance Due (green at zero);
   - "Payment History" (calendar tile): Date | Amount | Payment Type (the label, never the enum) |
     Reference | Status | Receipt ("—": no uploads yet) | Description | Action (trash → confirm; the
     server recalculates the totals and status) — or an empty state;
   - right: Customer Info · Invoice Details · Additional Notes.
   Every figure is the server's (InvoiceService); adding or deleting a payment puts the recalculated
   invoice in the cache, so the totals, history, badge and the list follow at once. */

/** The page's own origin — null during the server render, so the share URL never mismatches. */
const noSubscribe = () => () => {}
function useOrigin(): string | null {
  return React.useSyncExternalStore(
    noSubscribe,
    () => window.location.origin,
    () => null,
  )
}

export function InvoiceDetailsPage({ initial }: { initial: Invoice }) {
  const t = useTranslations('invoices.details')
  const invoice = useInvoice(initial.id, { initialData: initial })
  const data = invoice.data ?? initial
  usePageCrumb(t('title', { number: data.invoice_number }))

  if (invoice.isError && toApiError(invoice.error).status === 404) return <InvoiceNotFound />
  return <InvoiceDetails invoice={data} />
}

function InvoiceDetails({ invoice }: { invoice: Invoice }) {
  const t = useTranslations('invoices.details')
  const origin = useOrigin()
  const settings = useInvoiceSettings()
  const [payment, setPayment] = React.useState({ key: 0, open: false })
  const [billing, setBilling] = React.useState({ key: 0, open: false })
  const shareUrl = origin ? `${origin}/i/${invoice.public_token}` : null
  const fullyPaid = isAtMost(invoice.balance_due, '0')

  const addPayment = (
    <>
      <DollarSign className="size-icon" aria-hidden="true" />
      {t('actions.addPayment')}
    </>
  )

  return (
    <>
      <PageHeader
        title={t('title', { number: invoice.invoice_number })}
        subtitle={t('subtitle')}
        action={
          <>
            {/* The document prints, not this page: the share page opens in a new tab with its print
                dialog (?print=1) — the same layout as the link, no app chrome. */}
            <Button variant="outline" size="sm" onClick={() => window.open(`/i/${invoice.public_token}?print=1`, '_blank', 'noopener')}>
              <Printer className="size-icon" aria-hidden="true" />
              {t('actions.print')}
            </Button>
            {fullyPaid ? (
              // Not `disabled`: it stays focusable, so the reason is reachable by keyboard too.
              <Tooltip content={t('actions.fullyPaid')}>
                <Button
                  variant="outline"
                  size="sm"
                  aria-disabled
                  aria-description={t('actions.fullyPaid')}
                  className="cursor-not-allowed opacity-disabled"
                  onClick={(event) => event.preventDefault()}
                >
                  {addPayment}
                </Button>
              </Tooltip>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setPayment((p) => ({ key: p.key + 1, open: true }))}>
                {addPayment}
              </Button>
            )}
            <ComingSoon>
              <Button variant="outline" size="sm">
                <Send className="size-icon" aria-hidden="true" />
                {t('actions.sendInvoice')}
              </Button>
            </ComingSoon>
            {shareUrl ? (
              <CopyButton variant="button" value={shareUrl} label={t('actions.copyLink')} toastMessage={t('actions.linkCopied')}>
                {t('actions.copyLink')}
              </CopyButton>
            ) : (
              <Skeleton className="h-control-sm w-28 rounded-lg" />
            )}
            <ComingSoon>
              <Button size="sm">
                <Bell className="size-icon" aria-hidden="true" />
                {t('actions.sendReminder')}
              </Button>
            </ComingSoon>
            <Button asChild variant="outline" size="sm">
              <Link href="/invoices">
                <ArrowLeft className="size-icon" aria-hidden="true" />
                {t('actions.back')}
              </Link>
            </Button>
          </>
        }
      />

      <div className="mt-4 grid grid-cols-1 items-start gap-4 xl:grid-cols-3">
        <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
          <BillingCard
            invoice={invoice}
            settings={settings.data}
            settingsLoading={settings.isPending}
            shareUrl={shareUrl}
            onEditFrom={() => setBilling((b) => ({ key: b.key + 1, open: true }))}
          />
          <ItemsCard invoice={invoice} />
          <PaymentsCard invoice={invoice} />
        </div>

        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeading divided title={t('customer.title')} />
            <div className="p-card">
              {invoice.client ? (
                <IdentityCell name={invoice.client.name} secondary={invoice.client.email} initials={invoice.client.initials} colorKey={invoice.client.name} outlined size="md" />
              ) : (
                <p className="text-body text-muted-foreground">{t('customer.none')}</p>
              )}
            </div>
          </Card>
          <Card>
            <CardHeading divided title={t('info.title')} />
            <div className="p-card">
              <DetailList
                columns={1}
                items={[
                  { id: 'number', label: t('info.number'), value: <InvoiceNumberBadge number={invoice.invoice_number} /> },
                  { id: 'date', label: t('info.invoiceDate'), value: <CreatedDate iso={invoice.invoice_date} /> },
                  {
                    id: 'due',
                    label: t('info.dueDate'),
                    value: (
                      <span className={cn('inline-flex flex-wrap items-center gap-2', invoice.is_overdue && 'text-danger')}>
                        <CreatedDate iso={invoice.due_date} />
                        {invoice.is_overdue ? (
                          <Badge tone="danger" size="sm">
                            {t('info.overdue')}
                          </Badge>
                        ) : null}
                      </span>
                    ),
                  },
                ]}
              />
            </div>
          </Card>
          <Card>
            <CardHeading divided title={t('notes.title')} />
            <div className="p-card">
              {invoice.notes ? (
                <p className="text-body break-words whitespace-pre-line">{invoice.notes}</p>
              ) : (
                <p className="text-body text-muted-foreground">{t('notes.empty')}</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      <AddPaymentModal key={`payment-${payment.key}`} open={payment.open} onOpenChange={(open) => setPayment((p) => ({ ...p, open }))} invoice={invoice} />
      <BillingDetailsModal
        key={`billing-${billing.key}`}
        open={billing.open}
        onOpenChange={(open) => setBilling((b) => ({ ...b, open }))}
        settings={settings.data}
      />
    </>
  )
}

/* ── Billing & Addresses ── */

function AddressBlock({ title, action, children, className }: { title: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  const id = React.useId()
  return (
    <section aria-labelledby={id} className={cn('min-w-0 rounded-lg bg-muted p-4', className)}>
      <div className="mb-2 flex min-h-control-sm items-center justify-between gap-2">
        <h3 id={id} className="text-body-sm font-medium text-muted-foreground">
          {title}
        </h3>
        {action}
      </div>
      <div className="flex flex-col gap-0.5 text-body-sm break-words text-muted-foreground">{children}</div>
    </section>
  )
}

function Lines({ name, lines }: { name: string | null | undefined; lines: ReadonlyArray<string | null | undefined> }) {
  return (
    <>
      {name ? <p className="text-body font-semibold text-foreground">{name}</p> : null}
      {lines.filter((line): line is string => Boolean(line && line.trim())).map((line, index) => (
        <p key={index} className="whitespace-pre-line">
          {line}
        </p>
      ))}
    </>
  )
}

/** "Austin, TX 78701" — whichever parts are set. */
function cityLine(settings: InvoiceSettings): string {
  const region = [settings.state, settings.zip].filter(Boolean).join(' ')
  return [settings.city, region].filter(Boolean).join(', ')
}

function BillingCard({
  invoice,
  settings,
  settingsLoading,
  shareUrl,
  onEditFrom,
}: {
  invoice: Invoice
  settings: InvoiceSettings | undefined
  settingsLoading: boolean
  shareUrl: string | null
  onEditFrom: () => void
}) {
  const t = useTranslations('invoices.details.billing')
  const hasFrom = settings && Object.values(settings).some((value) => value)

  return (
    <Card>
      <CardHeading divided title={t('title')} icon={FileText} />
      <div className="grid grid-cols-1 gap-6 p-card md:grid-cols-[minmax(0,1fr)_auto]">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <AddressBlock
            title={t('billedFrom')}
            action={
              <Tooltip content={t('editFrom')}>
                <Button variant="ghost" size="icon-sm" aria-label={t('editFrom')} onClick={onEditFrom} disabled={settingsLoading}>
                  <Pencil className="size-icon" aria-hidden="true" />
                </Button>
              </Tooltip>
            }
          >
            {settingsLoading ? (
              <>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
              </>
            ) : settings && hasFrom ? (
              <Lines name={settings.company_name} lines={[settings.email, settings.phone, settings.address, cityLine(settings), settings.country]} />
            ) : (
              <p>{t('notSet')}</p>
            )}
          </AddressBlock>
          <AddressBlock title={t('billedTo')} action={<InvoiceStatusBadge invoice={invoice} />}>
            {invoice.client ? (
              <Lines name={invoice.client.name} lines={[invoice.client.company_name, invoice.client.email, invoice.client.phone, invoice.client.address]} />
            ) : (
              <p>{t('noClient')}</p>
            )}
          </AddressBlock>
          <AddressBlock title={t('project')} className="sm:col-span-2">
            {invoice.project ? <Lines name={invoice.project.name} lines={[invoice.project.description ?? t('noDescription')]} /> : <p>-</p>}
          </AddressBlock>
        </div>
        <figure className="flex flex-col items-center gap-2 justify-self-center md:justify-self-end">
          {shareUrl ? (
            <QrCode value={shareUrl} size={136} label={t('qrLabel', { number: invoice.invoice_number })} className="border border-border p-1" />
          ) : (
            <Skeleton className="size-36 rounded-lg" />
          )}
          <figcaption className="text-body-sm text-muted-foreground">{t('qrCaption')}</figcaption>
        </figure>
      </div>
    </Card>
  )
}

/* ── Invoice Items + totals ── */

function ItemsCard({ invoice }: { invoice: Invoice }) {
  const t = useTranslations('invoices.details.items')
  const money = useMoney()
  const hasDiscount = !isAtMost(invoice.discount_amount, '0')
  const settled = isAtMost(invoice.balance_due, '0')

  const columns = React.useMemo<DataTableColumn<InvoiceLine>[]>(
    () => [
      { id: 'description', header: t('description'), cell: (line) => <span className="block max-w-md break-words whitespace-pre-line">{line.description}</span> },
      { id: 'qty', header: t('qty'), align: 'right', cell: (line) => <span className="font-mono text-money">{line.quantity}</span> },
      { id: 'price', header: t('unitPrice'), align: 'right', cell: (line) => <span className="font-mono text-money">{money(line.price)}</span> },
      { id: 'total', header: t('total'), align: 'right', cell: (line) => <span className="font-mono text-money font-semibold">{money(line.total)}</span> },
    ],
    [t, money],
  )

  const rows: { id: string; label: string; value: string; className?: string; strong?: boolean; rule?: boolean }[] = [
    { id: 'subtotal', label: t('subtotal'), value: money(invoice.subtotal) },
    { id: 'discount', label: t('discount'), value: hasDiscount ? money(`-${invoice.discount_amount}`) : money('0'), className: 'text-danger' },
    { id: 'tax', label: t('tax', { rate: Number(invoice.tax_rate) }), value: money(invoice.tax_amount) },
    { id: 'total', label: t('totalAmount'), value: money(invoice.total), strong: true, rule: true },
    { id: 'paid', label: t('paidAmount'), value: money(invoice.paid_amount), className: 'text-success' },
    { id: 'balance', label: t('balanceDue'), value: money(invoice.balance_due), strong: true, className: settled ? 'text-success' : undefined },
  ]

  return (
    <Card>
      <CardHeading divided title={t('title')} />
      <DataTable label={t('tableLabel')} columns={columns} rows={invoice.items} getRowId={(line) => line.id} className="rounded-none border-0 shadow-none" />
      <div className="flex justify-end border-t border-border p-card">
        <dl className="flex w-full flex-col gap-3 sm:max-w-xs">
          {rows.map((row) => (
            <div key={row.id} className={cn('flex items-baseline justify-between gap-4', row.rule && 'mt-1 border-t border-border pt-4')}>
              <dt className={cn('text-body', row.strong ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{row.label}</dt>
              <dd className={cn('font-mono text-money', row.strong && 'font-semibold', row.className)}>{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Card>
  )
}

/* ── Payment History ── */

function PaymentsCard({ invoice }: { invoice: Invoice }) {
  const t = useTranslations('invoices.details.payments')
  const money = useMoney()
  const remove = useDeletePayment(invoice.id)
  const [deleting, setDeleting] = React.useState<InvoicePayment | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const columns = React.useMemo<DataTableColumn<InvoicePayment>[]>(
    () => [
      { id: 'date', header: t('date'), cell: (payment) => <CreatedDate iso={payment.payment_date} /> },
      { id: 'amount', header: t('amount'), cell: (payment) => <span className="font-mono text-money font-semibold">{money(payment.amount)}</span> },
      {
        id: 'type',
        header: t('type'),
        cell: (payment) => (
          <Badge tone="info" className="whitespace-nowrap">
            {payment.payment_type_label}
          </Badge>
        ),
      },
      { id: 'reference', header: t('reference'), cell: (payment) => <CodeChip>{payment.reference}</CodeChip> },
      {
        id: 'status',
        header: t('status'),
        cell: (payment) => (
          <Badge tone="success" outlined>
            {payment.status_label}
          </Badge>
        ),
      },
      {
        id: 'receipt',
        header: t('receipt'),
        cell: () => (
          <span className="text-muted-foreground">
            <span aria-hidden="true">—</span>
            <span className="sr-only">{t('noReceipt')}</span>
          </span>
        ),
      },
      {
        id: 'description',
        header: t('description'),
        cell: (payment) =>
          payment.description ? (
            <span className="block max-w-56 truncate" title={payment.description}>
              {payment.description}
            </span>
          ) : (
            '-'
          ),
      },
      {
        id: 'action',
        header: t('action'),
        align: 'right',
        cell: (payment) => (
          <RowActions
            actions={[
              {
                id: 'delete',
                label: t('delete', { reference: payment.reference }),
                tooltip: t('deleteTip'),
                icon: Trash2,
                tone: 'danger',
                onClick: () => {
                  setError(null)
                  setDeleting(payment)
                },
              },
            ]}
          />
        ),
      },
    ],
    [t, money],
  )

  const confirmDelete = () => {
    if (!deleting) return
    remove.mutate(deleting.id, {
      onSuccess: () => {
        toast.success(t('deleted', { reference: deleting.reference }))
        setDeleting(null)
      },
      onError: (err) => setError(toApiError(err).message),
    })
  }

  return (
    <Card>
      <CardHeading divided title={t('title')} icon={Calendar} />
      <DataTable
        label={t('tableLabel', { number: invoice.invoice_number })}
        columns={columns}
        rows={invoice.payments}
        getRowId={(payment) => payment.id}
        className="rounded-none border-0 shadow-none"
        empty={<EmptyState icon={DollarSign} title={t('emptyTitle')} description={t('emptyDescription')} />}
      />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title={t('confirmTitle')}
        description={deleting ? t('confirmBody', { reference: deleting.reference, amount: money(deleting.amount) }) : ''}
        confirmLabel={t('confirm')}
        cancelLabel={t('cancel')}
        closeLabel={t('close')}
        onConfirm={confirmDelete}
        pending={remove.isPending}
        error={error}
      />
    </Card>
  )
}

/** The page's frame while the invoice loads (the route's loading.tsx). */
export function InvoiceDetailsSkeleton() {
  const t = useTranslations('invoices.details')
  return (
    <div aria-busy="true">
      <span className="sr-only" role="status">
        {t('loading')}
      </span>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-control-sm w-24 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="flex flex-col gap-4 xl:col-span-2">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-80 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-52 w-full rounded-xl" />
          <Skeleton className="h-32 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
