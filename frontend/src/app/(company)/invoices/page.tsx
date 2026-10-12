import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { InvoicesPage } from '@/features/invoices/components/invoices-page'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('invoices.list')
  return { title: t('title') }
}

/* Company invoices (PRD §6.8, PAGE SPEC A). The whole page is the client <InvoicesPage />: its list
   state lives in the URL (useSearchParams, hence the Suspense boundary). Guarded by the (company)
   layout; the API scopes every invoice to the signed-in company. */
export default function CompanyInvoicesPage() {
  return (
    <Suspense>
      <InvoicesPage />
    </Suspense>
  )
}
