import { cache, Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { ProjectDetailsPage } from '@/features/projects/components/project-details-page'
import type { ProjectDetail } from '@/features/projects/types'
import { serverApiGet } from '@/lib/server-api'

type Props = { params: Promise<{ id: string }> }

// One API call per request, shared by the metadata and the page.
const loadProject = cache((id: string) => serverApiGet<ProjectDetail>(`/api/v1/projects/${id}`))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const t = await getTranslations('projects.details')
  const result = /^\d+$/.test(id) ? await loadProject(id) : null
  return { title: result?.data ? result.data.name : t('metaTitle') }
}

/* Project details (PRD §6.3, PAGE SPEC C). Loaded on the server so a malformed, missing, deleted
   or other company's id is a real 404 (notFound() → not-found.tsx — the API answers 404 for
   another company's project); loading.tsx shows the skeleton meanwhile. The client page takes
   over with the same data and keeps it live; its active tab lives in the URL (useSearchParams,
   hence the Suspense boundary). Guarded by the (company) layout. */
export default async function CompanyProjectPage({ params }: Props) {
  const { id } = await params
  if (!/^\d+$/.test(id)) notFound()

  const result = await loadProject(id)
  if (result.status === 404) notFound()
  if (!result.data) {
    throw new Error(`Could not load project ${id} (status ${result.status}).`)
  }

  return (
    <Suspense>
      <ProjectDetailsPage initial={result.data} />
    </Suspense>
  )
}
