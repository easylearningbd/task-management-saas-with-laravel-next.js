'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, CircleAlert, SquarePen } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PageHeader } from '@/components/layout/app-shell'
import { usePageCrumb } from '@/components/layout/page-crumb'
import { TabPanel, Tabs, type TabItem } from '@/components/shared/tabs'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { toApiError } from '@/lib/api-error'
import { useTask } from '@/features/tasks/api'
import { TaskFormModal } from '@/features/tasks/components/task-form-modal'
import { TaskInfoCards, TaskInfoCardsSkeleton } from '@/features/tasks/components/task-info-cards'
import { TaskNotFound } from '@/features/tasks/components/task-not-found'
import { DEFAULT_TASK_TAB, resolveTaskTab, TASK_TABS, taskTabCount, type TaskTabId } from '@/features/tasks/tabs/registry'
import type { TaskDetail } from '@/features/tasks/types'

/* /tasks/{id} — PAGE SPEC C and the task details screenshot. The header (the task's title,
   "View and manage task details.", a green "Edit Task" and an outline "Back" to the board), the
   four info cards, then the pill tab bar from the registry (tabs/registry.ts — its tabs share
   the track's width, as drawn) and the active tab's panel. The active tab lives in the URL
   (`?tab=checklist`; Details has none); an unknown tab falls back to Details. Only the active
   tab renders (and loads its data).
   The server component loads the task (a missing, deleted or other-company id is a real 404);
   this page keeps it live through `useTask`, so a checklist or file change refreshes the tab
   counts and an edit the cards. The breadcrumb's last step is the title.
   (The screenshot frames everything under the header in one more bordered panel; Card.md says
   cards never nest, and the project details page has none — so neither does this one.) */

const TABS_ID = 'task-tabs'

export function TaskDetailsPage({ initial }: { initial: TaskDetail }) {
  const t = useTranslations('tasks.details')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = useTask(initial.id, { initialData: initial })
  const task = query.data
  const [form, setForm] = React.useState({ key: 0, open: false })

  usePageCrumb(task?.title ?? null)

  const active = resolveTaskTab(searchParams.get('tab'))
  const setTab = (tab: TaskTabId) => {
    const next = new URLSearchParams(searchParams.toString())
    if (tab === DEFAULT_TASK_TAB) next.delete('tab')
    else next.set('tab', tab)
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  if (query.isError && toApiError(query.error).status === 404) {
    // Deleted (or gone) while the page was open.
    return <TaskNotFound />
  }

  if (!task) {
    return query.isError ? (
      <EmptyState
        framed
        icon={CircleAlert}
        tone="danger"
        title={t('error.title')}
        description={toApiError(query.error).message}
        action={
          <Button variant="outline" onClick={() => query.refetch()}>
            {t('error.retry')}
          </Button>
        }
      />
    ) : (
      <TaskDetailsSkeleton />
    )
  }

  const items: TabItem<TaskTabId>[] = TASK_TABS.map((tab) => ({
    value: tab.id,
    label: t(`tabs.${tab.labelKey}`),
    count: tab.count ? taskTabCount(task, tab.count) : undefined,
  }))
  const current = TASK_TABS.find((tab) => tab.id === active)
  const Panel = current && current.status === 'live' ? current.component : null

  return (
    <>
      <PageHeader
        title={task.title}
        subtitle={t('subtitle')}
        action={
          <>
            <Button size="sm" onClick={() => setForm((f) => ({ key: f.key + 1, open: true }))}>
              <SquarePen className="size-icon" aria-hidden="true" />
              {t('edit')}
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href="/tasks">
                <ArrowLeft className="size-icon" aria-hidden="true" />
                {t('back')}
              </Link>
            </Button>
          </>
        }
      />

      <div className="mt-4 flex flex-col gap-4">
        <TaskInfoCards task={task} />
        <Tabs idBase={TABS_ID} variant="pill" stretch label={t('tabs.label')} items={items} value={active} onValueChange={setTab} />
        <TabPanel idBase={TABS_ID} value={active} className="rounded-xl">
          {Panel ? <Panel task={task} /> : null}
        </TabPanel>
      </div>

      <TaskFormModal key={form.key} open={form.open} onOpenChange={(open) => setForm((f) => ({ ...f, open }))} task={task} />
    </>
  )
}

/** The page's frame while the task loads (route loading.tsx and the client fallback). */
export function TaskDetailsSkeleton() {
  const t = useTranslations('tasks.details')
  return (
    <div aria-busy="true">
      <span className="sr-only" role="status">
        {t('loading')}
      </span>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64 max-w-full" />
          <Skeleton className="h-4 w-56 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-control-sm w-28 rounded-lg" />
          <Skeleton className="h-control-sm w-20 rounded-lg" />
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-4">
        <TaskInfoCardsSkeleton />
        <Skeleton className="h-11 w-full rounded-tile" />
        <Skeleton className="h-28 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
