import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { ProjectsPage } from '@/features/projects/components/projects-page'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('projects.list')
  return { title: t('title') }
}

/* Company projects (PRD §6.3, PAGE SPEC A). The whole page is the client <ProjectsPage />: its list
   state (status tab and view included) lives in the URL (useSearchParams, hence the Suspense
   boundary). Guarded by the (company) layout; the API scopes every project to the signed-in
   company. */
export default function CompanyProjectsPage() {
  return (
    <Suspense>
      <ProjectsPage />
    </Suspense>
  )
}
