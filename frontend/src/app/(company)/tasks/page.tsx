import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { TasksPage } from '@/features/tasks/components/tasks-page'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('tasks.list')
  return { title: t('title') }
}

/* Company tasks (PRD §6.4, PAGE SPEC A). The whole page is the client <TasksPage />: its state
   (priority tab, selects, view) lives in the URL (useSearchParams, hence the Suspense boundary).
   Guarded by the (company) layout; the API scopes every task to the signed-in company. */
export default function CompanyTasksPage() {
  return (
    <Suspense>
      <TasksPage />
    </Suspense>
  )
}
