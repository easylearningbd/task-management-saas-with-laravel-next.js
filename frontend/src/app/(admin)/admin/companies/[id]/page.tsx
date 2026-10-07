import { cache } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { CompanyDetailsHeader } from '@/features/companies/components/company-details-header'
import { CompanyDetailsPage } from '@/features/companies/components/company-details-page'
import type { CompanyDetail } from '@/features/companies/types'
import { serverApiGet } from '@/lib/server-api'

type Props = { params: Promise<{ id: string }> }

// One API call per request, shared by the metadata and the page.
const loadCompany = cache((id: string) => serverApiGet<CompanyDetail>(`/api/v1/admin/companies/${id}`))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const t = await getTranslations('companies.details')
  const result = /^\d+$/.test(id) ? await loadCompany(id) : null
  return { title: result?.data ? t('metaTitle', { name: result.data.name }) : t('title') }
}

/* Company details (PAGE SPEC D). Loaded on the server so a missing or soft-deleted id is a
   real 404 (notFound() → not-found.tsx); loading.tsx shows the skeleton meanwhile. The client
   page takes over with the same data and keeps it live. */
export default async function CompanyPage({ params }: Props) {
  const { id } = await params
  if (!/^\d+$/.test(id)) notFound()

  const result = await loadCompany(id)
  if (result.status === 404) notFound()
  if (!result.data) {
    throw new Error(`Could not load company ${id} (status ${result.status}).`)
  }

  return (
    <>
      <CompanyDetailsHeader />
      <CompanyDetailsPage initial={result.data} />
    </>
  )
}
