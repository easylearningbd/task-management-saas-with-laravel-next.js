'use client'

import * as React from 'react'
import { Building2, FileText, Mail, MapPin, Phone } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PrintButton, PrintLayout } from '@/components/shared/print-layout'
import { QrCode } from '@/components/shared/qr-code'
import { EmptyState } from '@/components/ui/empty-state'
import { isAtMost } from '@/features/invoices/calc'
import { InvoiceStatusBadge } from '@/features/invoices/components/invoice-columns'
import type { InvoiceSettings, PublicInvoice } from '@/features/invoices/types'
import { useMoney } from '@/lib/format-money'
import { cn } from '@/lib/cn'

/* /i/{token} — PAGE SPEC D: the public invoice, a standalone document (PrintLayout: no app chrome,
   always light, a centred sheet with Print above it — not printed). The document styling is the
   blue `doc-*` set (Invoices Phase 0 decision A — aliases of the design system's blues), not the
   app's green. Top to bottom:
   - "INVOICE", the company's billing block (name, address lines, Phone:, Email:) · the status badge,
     Invoice Number (accent), Invoice Date, Due Date · the QR of this page in a dashed "SCAN TO SHARE"
     box;
   - an accent rule; "Bill To" (a panel: building icon + the client in bold, then envelope / phone /
     pin rows) and "Project" (a panel with its name);
   - the items: an accent header row in white, rows subtly alternating;
   - "Notes" (a panel) and the totals — Subtotal, Discount and each tax when there are any (the
     total wouldn't add up without them), Total, Paid (green, never negative), then the highlighted
     "BALANCE DUE:" row in the accent;
   - an accent rule and the footer: "Thank you for your business!" · "Need help?" with the company's
     email and phone.
   Only what the API's PublicInvoiceResource exposes is shown — no ids, nothing else about the company.
   `autoPrint` (?print=1 — the details page's Print) opens the print dialog once the page is drawn. */

function addressLines(from: InvoiceSettings): string[] {
  const region = [from.state, from.zip].filter(Boolean).join(' ')
  return [from.address, [from.city, region].filter(Boolean).join(', '), from.country].filter((line): line is string => Boolean(line))
}

export function PublicInvoiceDocument({ invoice, shareUrl, autoPrint = false }: { invoice: PublicInvoice; shareUrl: string; autoPrint?: boolean }) {
  const t = useTranslations('invoices.public')
  const money = useMoney()
  const from = invoice.billed_from

  React.useEffect(() => {
    if (!autoPrint) return
    // After the first paint (the QR included), so the dialog shows the finished document.
    const id = window.setTimeout(() => window.print(), 300)
    return () => window.clearTimeout(id)
  }, [autoPrint])

  const hasDiscount = !isAtMost(invoice.discount_amount, '0')
  const contact = [from.email, from.phone].filter(Boolean).join(' · ')

  return (
    <PrintLayout actions={<PrintButton label={t('print')} />} className="p-6 sm:p-10 print:p-0">
      {/* Head: company · invoice facts · QR */}
      {/* On paper (A4 is narrower than `md`) the head keeps its three columns, so the document fits one page. */}
      <header className="grid grid-cols-1 gap-6 sm:grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1fr)_auto_auto] print:grid-cols-[minmax(0,1fr)_auto_auto]">
        <div className="min-w-0">
          <h1 className="text-display tracking-wide text-doc-accent-strong">{t('heading')}</h1>
          <div className="mt-3 flex flex-col gap-0.5 text-body-sm break-words text-muted-foreground">
            {from.company_name ? <p className="text-title-card text-foreground">{from.company_name}</p> : null}
            {addressLines(from).map((line) => (
              <p key={line}>{line}</p>
            ))}
            {from.phone ? <p>{t('phone', { value: from.phone })}</p> : null}
            {from.email ? <p>{t('email', { value: from.email })}</p> : null}
          </div>
        </div>

        <div className="flex flex-col items-start gap-3">
          <InvoiceStatusBadge invoice={invoice} />
          <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-1.5 text-body-sm">
            <dt className="text-muted-foreground">{t('number')}</dt>
            <dd className="font-semibold text-doc-accent-strong">{invoice.invoice_number}</dd>
            <dt className="text-muted-foreground">{t('invoiceDate')}</dt>
            <dd className="font-medium">{invoice.invoice_date}</dd>
            <dt className="text-muted-foreground">{t('dueDate')}</dt>
            <dd className="font-medium">{invoice.due_date}</dd>
          </dl>
        </div>

        <figure className="flex flex-col items-center gap-2 justify-self-start rounded-lg border border-dashed border-border p-3 sm:col-span-2 md:col-span-1 md:justify-self-end print:col-span-1 print:justify-self-end">
          <QrCode value={shareUrl} size={104} label={t('qrLabel', { number: invoice.invoice_number })} />
          <figcaption className="text-caption font-semibold tracking-wide text-muted-foreground">{t('scan')}</figcaption>
        </figure>
      </header>

      <hr className="my-6 border-t-2 border-doc-accent" />

      {/* Bill To · Project */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <section>
          <h2 className="mb-2 text-title-row text-doc-accent-strong">{t('billTo')}</h2>
          <div className="flex flex-col gap-1.5 rounded-lg bg-doc-panel p-4 text-body-sm break-words">
            {invoice.bill_to ? (
              <>
                <p className="flex items-center gap-2 text-title-row">
                  <Building2 className="size-icon shrink-0 text-doc-accent" aria-hidden="true" />
                  {invoice.bill_to.name}
                </p>
                <ContactRow icon={Mail} value={invoice.bill_to.email} />
                <ContactRow icon={Phone} value={invoice.bill_to.phone} />
                <ContactRow icon={MapPin} value={invoice.bill_to.address} />
              </>
            ) : (
              <p className="text-muted-foreground">{t('noClient')}</p>
            )}
          </div>
        </section>
        <section>
          <h2 className="mb-2 text-title-row text-doc-accent-strong">{t('project')}</h2>
          <div className="rounded-lg bg-doc-panel p-4 text-title-row break-words">{invoice.project?.name ?? '—'}</div>
        </section>
      </div>

      {/* Items */}
      <div className="mt-6 overflow-x-auto rounded-lg print:overflow-visible">
        <table className="w-full text-body break-inside-avoid">
          <caption className="sr-only">{t('table.label', { number: invoice.invoice_number })}</caption>
          <thead>
            <tr className="bg-doc-accent text-doc-on-accent">
              <th scope="col" className="px-4 py-3 text-left text-table-head font-semibold">
                {t('table.description')}
              </th>
              <th scope="col" className="px-4 py-3 text-right text-table-head font-semibold">
                {t('table.qty')}
              </th>
              <th scope="col" className="px-4 py-3 text-right text-table-head font-semibold whitespace-nowrap">
                {t('table.unitPrice')}
              </th>
              <th scope="col" className="px-4 py-3 text-right text-table-head font-semibold">
                {t('table.total')}
              </th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, index) => (
              <tr key={index} className="border-b border-border even:bg-doc-panel">
                <td className="px-4 py-3 break-words whitespace-pre-line">{item.description}</td>
                <td className="px-4 py-3 text-right font-mono text-money">{item.quantity}</td>
                <td className="px-4 py-3 text-right font-mono text-money whitespace-nowrap">{money(item.price)}</td>
                <td className="px-4 py-3 text-right font-mono text-money font-semibold whitespace-nowrap">{money(item.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Notes · totals */}
      <div className="mt-6 grid grid-cols-1 items-start gap-6 sm:grid-cols-2 print:break-inside-avoid">
        <section>
          <h2 className="mb-2 text-title-row text-doc-accent-strong">{t('notes')}</h2>
          <div className="rounded-lg bg-doc-panel p-4 text-body-sm break-words whitespace-pre-line">
            {invoice.notes ?? <span className="text-muted-foreground">{t('noNotes')}</span>}
          </div>
        </section>
        <dl className="flex flex-col gap-2.5 text-body">
          <Row label={t('subtotal')} value={money(invoice.subtotal)} />
          {hasDiscount ? <Row label={t('discount')} value={money(`-${invoice.discount_amount}`)} className="text-danger" /> : null}
          {invoice.taxes.map((tax, index) => (
            <Row key={index} label={t('tax', { name: tax.name, rate: Number(tax.rate) })} value={money(tax.amount)} />
          ))}
          <Row label={t('total')} value={money(invoice.total)} strong />
          <Row label={t('paid')} value={money(invoice.paid_amount)} className="text-success" />
          <div className="mt-1 flex items-baseline justify-between gap-4 rounded-lg bg-doc-highlight px-4 py-3">
            <dt className="text-title-row font-bold">{t('balanceDue')}</dt>
            <dd className="font-mono text-title-card font-bold text-doc-accent-strong">{money(invoice.balance_due)}</dd>
          </div>
        </dl>
      </div>

      <hr className="mt-8 mb-5 border-t-2 border-doc-accent" />

      <footer className="flex flex-wrap items-start justify-between gap-4 text-body-sm print:break-inside-avoid">
        <p className="text-title-row text-doc-accent-strong">{t('thanks')}</p>
        {contact ? (
          <div className="text-right">
            <p className="font-semibold">{t('help')}</p>
            <p className="text-muted-foreground">{contact}</p>
          </div>
        ) : null}
      </footer>
    </PrintLayout>
  )
}

function ContactRow({ icon: Icon, value }: { icon: typeof Mail; value: string | null | undefined }) {
  if (!value) return null
  return (
    <p className="flex items-start gap-2 text-muted-foreground">
      <Icon className="mt-0.5 size-icon shrink-0 text-doc-accent" aria-hidden="true" />
      <span className="min-w-0 whitespace-pre-line">{value}</span>
    </p>
  )
}

function Row({ label, value, strong = false, className }: { label: string; value: string; strong?: boolean; className?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 px-4">
      <dt className={cn(strong ? 'font-semibold' : 'text-muted-foreground')}>{label}</dt>
      <dd className={cn('font-mono text-money', strong && 'font-semibold', className)}>{value}</dd>
    </div>
  )
}

/** A bad, unknown or deleted token — the same standalone canvas, no app chrome, nothing leaked. */
export function PublicInvoiceNotFound() {
  const t = useTranslations('invoices.public.notFound')
  return (
    <PrintLayout>
      <EmptyState icon={FileText} title={t('title')} description={t('description')} />
    </PrintLayout>
  )
}
