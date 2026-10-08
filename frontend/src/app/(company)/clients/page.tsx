import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { ClientsPage } from '@/features/clients/components/clients-page'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('clients.list')
  return { title: t('title') }
}

/* Company clients (PRD §6.7, PAGE SPEC A). The whole page is the client <ClientsPage />: its list
   state (view included) lives in the URL (useSearchParams, hence the Suspense boundary). Guarded
   by the (company) layout; the API scopes every client to the signed-in company. */
export default function CompanyClientsPage() {
  return (
    <Suspense>
      <ClientsPage />
    </Suspense>
  )
}
