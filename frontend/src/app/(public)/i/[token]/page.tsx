import { cache } from 'react'
import type { Metadata } from 'next'
import { headers } from 'next/headers'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { PublicInvoiceDocument } from '@/features/invoices/components/public-invoice-document'
import type { PublicInvoice } from '@/features/invoices/types'
import { serverApiGet } from '@/lib/server-api'

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ print?: string }> }

// The server's token rule (PublicInvoiceService): anything else is not found without asking the API.
const TOKEN = /^[A-Za-z0-9]{20,64}$/

// One API call per request, shared by the metadata and the page.
const loadInvoice = cache((token: string) => serverApiGet<PublicInvoice>(`/api/v1/public/invoices/${token}`))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params
  const t = await getTranslations('invoices.public')
  const result = TOKEN.test(token) ? await loadInvoice(token) : null
  return {
    title: result?.data ? t('metaTitle', { number: result.data.invoice_number }) : t('notFound.metaTitle'),
    // A private link: never indexed, never followed.
    robots: { index: false, follow: false },
  }
}

/* The public invoice (PRD §6.8, PAGE SPEC D) — no sign-in: proxy.ts lets /i/* through and the API
   endpoint is public; the unguessable token is the only key. Loaded on the server, so a malformed,
   unknown or deleted token is a clean not-found page (notFound() → not-found.tsx), never an error
   dump. The QR encodes this page's own URL. `?print=1` (the details page's Print) opens the print
   dialog once the document is drawn. */
export default async function PublicInvoicePage({ params, searchParams }: Props) {
  const { token } = await params
  const { print } = await searchParams
  if (!TOKEN.test(token)) notFound()

  const result = await loadInvoice(token)
  if (result.status === 404) notFound()
  if (!result.data) {
    throw new Error(`Could not load the shared invoice (status ${result.status}).`)
  }

  const h = await headers()
  const origin = `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`

  return <PublicInvoiceDocument invoice={result.data} shareUrl={`${origin}/i/${token}`} autoPrint={print === '1'} />
}
