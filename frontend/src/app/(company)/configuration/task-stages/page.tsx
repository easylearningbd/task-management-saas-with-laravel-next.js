import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { TaskStagesPage } from '@/features/task-stages/components/task-stages-page'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('taskStages.page')
  return { title: t('title') }
}

/* Company task stages (PRD §6.13) — stat cards and the drag-to-reorder Workflow Stages list.
   The whole page is the client <TaskStagesPage />: its filters live in the URL
   (useSearchParams, hence the Suspense boundary). Guarded by the (company) layout; the API
   scopes every stage to the signed-in company. */
export default function CompanyTaskStagesPage() {
  return (
    <Suspense>
      <TaskStagesPage />
    </Suspense>
  )
}
