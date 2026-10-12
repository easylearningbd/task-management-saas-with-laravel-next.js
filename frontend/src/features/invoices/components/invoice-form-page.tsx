'use client'

import * as React from 'react'
import Link from 'next/link'
import { CircleAlert, FileText, Lock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PageHeader } from '@/components/layout/app-shell'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useInvoice, useTaxes } from '@/features/invoices/api'
import { InvoiceForm } from '@/features/invoices/components/invoice-form'
import { emptyInvoiceForm, toInvoiceFormValues } from '@/features/invoices/schema'
import type { Invoice } from '@/features/invoices/types'
import { toApiError } from '@/lib/api-error'

/* /invoices/create and /invoices/{id}/edit (PAGE SPEC B) — breadcrumb Dashboard › Financial ›
   Invoices › Create Invoice / Edit Invoice. The form mounts once the company's active taxes are in
   (its Tax options and rates) — on the client, so "today" is the browser's date, not the server's.
   Edit takes the invoice the route loaded on the server (a missing or other company's id is a real
   404 there) and keeps it live: a Partial or Paid invoice never shows the form — a clear blocked
   state with the way back (the server answers 422 anyway); one deleted meanwhile shows not found. */

/** The browser's calendar date, YYYY-MM-DD. */
function localToday(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

export function CreateInvoicePage() {
  const t = useTranslations('invoices.form')
  const taxes = useTaxes()
  usePageCrumb(t('createTitle'))

  if (taxes.isError && !taxes.data) return <LoadError title={t('createTitle')} error={taxes.error} onRetry={() => void taxes.refetch()} />
  if (!taxes.data) return <InvoiceFormSkeleton />
  return <InvoiceForm mode={{ kind: 'create' }} defaultValues={emptyInvoiceForm(localToday())} taxes={taxes.data} />
}

export function EditInvoicePage({ initial }: { initial: Invoice }) {
  const t = useTranslations('invoices.form')
  const invoice = useInvoice(initial.id, { initialData: initial })
  const taxes = useTaxes()
  usePageCrumb(t('editTitle'))

  if (invoice.isError && toApiError(invoice.error).status === 404) return <InvoiceNotFound />
  const data = invoice.data ?? initial
  if (!data.can_edit) return <EditBlocked invoice={data} />
  if (taxes.isError && !taxes.data) return <LoadError title={t('editTitle')} error={taxes.error} onRetry={() => void taxes.refetch()} />
  if (!taxes.data) return <InvoiceFormSkeleton />

  const active = new Set(taxes.data.map((tax) => tax.id))
  const dropped = data.taxes.filter((tax) => tax.tax_id === null || !active.has(tax.tax_id)).map((tax) => tax.name)
  return <InvoiceForm mode={{ kind: 'edit', invoice: data }} defaultValues={toInvoiceFormValues(data, active)} taxes={taxes.data} droppedTaxes={dropped} />
}

function BackToInvoices({ label }: { label: string }) {
  return (
    <Button asChild variant="outline">
      <Link href="/invoices">{label}</Link>
    </Button>
  )
}

function EditBlocked({ invoice }: { invoice: Invoice }) {
  const t = useTranslations('invoices.form')
  return (
    <>
      <PageHeader title={t('editTitle')} subtitle={t('editSubtitle')} />
      <EmptyState
        framed
        className="mt-4"
        icon={Lock}
        title={t('blocked.title')}
        description={t('blocked.description', { number: invoice.invoice_number, status: invoice.status })}
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href={`/invoices/${invoice.id}`}>{t('blocked.view')}</Link>
            </Button>
            <BackToInvoices label={t('blocked.back')} />
          </div>
        }
      />
    </>
  )
}

/** A missing, deleted or other company's invoice — the API answers 404 for all three. */
export function InvoiceNotFound() {
  const t = useTranslations('invoices.form.notFound')
  return (
    <>
      <PageHeader title={t('heading')} />
      <EmptyState framed className="mt-4" icon={FileText} title={t('title')} description={t('description')} action={<BackToInvoices label={t('back')} />} />
    </>
  )
}

function LoadError({ title, error, onRetry }: { title: string; error: unknown; onRetry: () => void }) {
  const t = useTranslations('invoices.form.error')
  return (
    <>
      <PageHeader title={title} />
      <EmptyState
        framed
        className="mt-4"
        tone="danger"
        icon={CircleAlert}
        title={t('title')}
        description={toApiError(error).message}
        action={
          <Button variant="outline" onClick={onRetry}>
            {t('retry')}
          </Button>
        }
      />
    </>
  )
}

export function InvoiceFormSkeleton() {
  const t = useTranslations('invoices.form')
  return (
    <div aria-busy="true">
      <span className="sr-only" role="status">
        {t('loading')}
      </span>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-56 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <Skeleton className="h-control-sm w-20 rounded-lg" />
      </div>
      <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div className="flex flex-col gap-4 xl:col-span-2">
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
        <div className="flex flex-col gap-4">
          <Skeleton className="h-60 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
