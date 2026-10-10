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
import { useProject } from '@/features/projects/api'
import { ProjectPriorityBadge, ProjectStatusBadge } from '@/features/projects/components/project-badges'
import { ProjectFormModal } from '@/features/projects/components/project-form-modal'
import { ProjectNotFound } from '@/features/projects/components/project-not-found'
import { ProjectSummaryCards, ProjectSummaryCardsSkeleton } from '@/features/projects/components/project-summary-cards'
import { DEFAULT_PROJECT_TAB, PROJECT_TABS, resolveProjectTab, type ProjectTabId } from '@/features/projects/tabs/registry'
import type { ProjectDetail } from '@/features/projects/types'

/* /projects/{id} — PAGE SPEC C. The header (the project's name, the subtitle, a green
   "Edit Project" and an outline "Back" to the list), the status and priority badges, the four
   summary cards, then the pill tab bar from the registry (tabs/registry.ts) and the active tab's
   panel. The active tab lives in the URL (`?tab=milestones`; Overview has none), so a refresh or
   a shared link keeps it; an unknown or not-yet-live tab falls back to Overview. Only the active
   tab renders (and loads its data).
   The server component loads the project (a missing, deleted or other-company id is a real 404);
   this page keeps it live through the shared `useProject` query, so every change in any tab
   refreshes the cards, the counts and the Overview. The breadcrumb's last step is the name. */

const TABS_ID = 'project-tabs'

export function ProjectDetailsPage({ initial }: { initial: ProjectDetail }) {
  const t = useTranslations('projects.details')
  const tShared = useTranslations('shared')
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const query = useProject(initial.id, { initialData: initial })
  const project = query.data
  const [form, setForm] = React.useState({ key: 0, open: false })

  usePageCrumb(project?.name ?? null)

  const active = resolveProjectTab(searchParams.get('tab'))
  const setTab = (tab: ProjectTabId) => {
    const next = new URLSearchParams(searchParams.toString())
    if (tab === DEFAULT_PROJECT_TAB) next.delete('tab')
    else next.set('tab', tab)
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  if (query.isError && toApiError(query.error).status === 404) {
    // Deleted (or gone) while the page was open.
    return <ProjectNotFound />
  }

  if (!project) {
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
      <ProjectDetailsSkeleton />
    )
  }

  const items: TabItem<ProjectTabId>[] = PROJECT_TABS.map((tab) => ({
    value: tab.id,
    label: t(`tabs.${tab.labelKey}`),
    count: tab.count ? project.counts[tab.count] : undefined,
    disabled: tab.status === 'soon',
    disabledHint: tab.status === 'soon' ? tShared('comingSoon') : undefined,
  }))
  const current = PROJECT_TABS.find((tab) => tab.id === active)
  const Panel = current && current.status === 'live' ? current.component : null

  return (
    <>
      <PageHeader
        title={project.name}
        subtitle={t('subtitle')}
        action={
          <>
            <Button size="sm" onClick={() => setForm((f) => ({ key: f.key + 1, open: true }))}>
              <SquarePen className="size-icon" aria-hidden="true" />
              {t('edit')}
            </Button>
            <BackButton />
          </>
        }
      />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <ProjectStatusBadge project={project} />
        <ProjectPriorityBadge project={project} />
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <ProjectSummaryCards project={project} />
        <Tabs idBase={TABS_ID} variant="pill" label={t('tabs.label')} items={items} value={active} onValueChange={setTab} />
        <TabPanel idBase={TABS_ID} value={active} className="rounded-xl">
          {Panel ? <Panel project={project} /> : null}
        </TabPanel>
      </div>

      <ProjectFormModal key={form.key} open={form.open} onOpenChange={(open) => setForm((f) => ({ ...f, open }))} project={project} />
    </>
  )
}

function BackButton() {
  const t = useTranslations('projects.details')
  return (
    <Button asChild variant="outline" size="sm">
      <Link href="/projects">
        <ArrowLeft className="size-icon" aria-hidden="true" />
        {t('back')}
      </Link>
    </Button>
  )
}

/** The page's frame while the project loads (route loading.tsx and the client fallback). */
export function ProjectDetailsSkeleton() {
  const t = useTranslations('projects.details')
  return (
    <div aria-busy="true">
      <span className="sr-only" role="status">
        {t('loading')}
      </span>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-7 w-72 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-control-sm w-28 rounded-lg" />
          <Skeleton className="h-control-sm w-20 rounded-lg" />
        </div>
      </div>
      <div className="mt-3 flex gap-2">
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-16" />
      </div>
      <div className="mt-4 flex flex-col gap-4">
        <ProjectSummaryCardsSkeleton />
        <Skeleton className="h-11 w-full rounded-tile" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-44 w-full rounded-xl" />
          <Skeleton className="h-44 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}
