import { cache, Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { TaskDetailsPage } from '@/features/tasks/components/task-details-page'
import type { TaskDetail } from '@/features/tasks/types'
import { serverApiGet } from '@/lib/server-api'

type Props = { params: Promise<{ id: string }> }

// One API call per request, shared by the metadata and the page.
const loadTask = cache((id: string) => serverApiGet<TaskDetail>(`/api/v1/tasks/${id}`))

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const t = await getTranslations('tasks.details')
  const result = /^\d+$/.test(id) ? await loadTask(id) : null
  return { title: result?.data ? result.data.title : t('metaTitle') }
}

/* Task details (PRD §6.4, PAGE SPEC C). Loaded on the server so a malformed, missing, deleted or
   other company's id is a real 404 (notFound() → not-found.tsx — the API answers 404 for another
   company's task); loading.tsx shows the skeleton meanwhile. The client page takes over with the
   same data and keeps it live; its active tab lives in the URL (useSearchParams, hence the
   Suspense boundary). Guarded by the (company) layout. */
export default async function CompanyTaskPage({ params }: Props) {
  const { id } = await params
  if (!/^\d+$/.test(id)) notFound()

  const result = await loadTask(id)
  if (result.status === 404) notFound()
  if (!result.data) {
    throw new Error(`Could not load task ${id} (status ${result.status}).`)
  }

  return (
    <Suspense>
      <TaskDetailsPage initial={result.data} />
    </Suspense>
  )
}
