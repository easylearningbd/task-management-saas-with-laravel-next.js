import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { EditInvoicePage } from '@/features/invoices/components/invoice-form-page'
import type { Invoice } from '@/features/invoices/types'
import { serverApiGet } from '@/lib/server-api'

type Props = { params: Promise<{ id: string }> }

// One API call per request, shared by the metadata and the page.
const loadInvoice = cache((id: string) => serverApiGet<Invoice>(`/api/v1/invoices/${id}`))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const t = await getTranslations('invoices.form')
  const result = /^\d+$/.test(id) ? await loadInvoice(id) : null
  return { title: result?.data ? `${t('editTitle')} ${result.data.invoice_number}` : t('editTitle') }
}

/* Edit Invoice (PRD §6.8, PAGE SPEC B). Loaded on the server so a malformed, missing, deleted or
   other company's id is a real 404 (notFound() → ../not-found.tsx — the API answers 404 for another
   company's invoice); loading.tsx shows the skeleton meanwhile. A Partial / Paid invoice is
   refused by the client page (and by the API). Guarded by the (company) layout. */
export default async function CompanyEditInvoicePage({ params }: Props) {
  const { id } = await params
  if (!/^\d+$/.test(id)) notFound()

  const result = await loadInvoice(id)
  if (result.status === 404) notFound()
  if (!result.data) {
    throw new Error(`Could not load invoice ${id} (status ${result.status}).`)
  }

  return <EditInvoicePage initial={result.data} />
}
