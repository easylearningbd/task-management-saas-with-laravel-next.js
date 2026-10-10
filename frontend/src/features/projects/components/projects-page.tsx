'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { CircleAlert, Folder, Plus, Search } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PageHeader } from '@/components/layout/app-shell'
import { CardGrid } from '@/components/shared/card-grid'
import { DataTable } from '@/components/shared/data-table'
import { FilterBar } from '@/components/shared/filter-bar'
import { Pagination } from '@/components/shared/pagination'
import { TabPanel } from '@/components/shared/tabs'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'
import { ViewToggle } from '@/components/ui/view-toggle'
import { useDeleteProject, useProjects, useProjectStats, useToggleProjectStatus } from '@/features/projects/api'
import { useProjectActions } from '@/features/projects/components/project-actions'
import { ProjectCard, ProjectCardSkeleton } from '@/features/projects/components/project-card'
import { useProjectColumns } from '@/features/projects/components/project-columns'
import { ProjectClientFilter, ProjectCreatedFilter, ProjectPriorityFilter } from '@/features/projects/components/project-filters'
import { ProjectFormModal } from '@/features/projects/components/project-form-modal'
import { ProjectStats } from '@/features/projects/components/project-stats'
import { PROJECT_STATUS_TABS_ID, ProjectStatusTabs } from '@/features/projects/components/project-status-tabs'
import type { Project } from '@/features/projects/types'
import { useProjectListParams } from '@/features/projects/use-project-list-params'
import { toApiError } from '@/lib/api-error'

/* /projects — PAGE SPEC A and the Projects screenshots: the header (title, subtitle, green
   "+ Add Project"), the four stat cards, the filter bar card (search · All Priority ·
   All Clients · Filters → Created At range + Reset · list/grid toggle), the status tabs with
   counts, then the table (or the grid) with its footer. All list state — the status tab and the
   view included — lives in the URL.
   Lock: Active ⇄ Inactive with a toast; Completed / On Hold refuse with a tooltip (and the
   server's message if it ever gets there). Delete: a confirm naming the project and what goes
   with it. Add / Edit share ProjectFormModal (a fresh form per opening). The eye opens the
   project's details page. */

type FormState = { key: number; open: boolean; project: Project | null }

export function ProjectsPage() {
  const t = useTranslations('projects.list')
  const router = useRouter()
  const list = useProjectListParams()
  const { state, params, setPage, view, setView } = list
  const projects = useProjects(params)
  const stats = useProjectStats()
  const remove = useDeleteProject()
  const { mutate: toggleStatus } = useToggleProjectStatus()

  const [deleting, setDeleting] = React.useState<Project | null>(null)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)
  const [form, setForm] = React.useState<FormState>({ key: 0, open: false, project: null })

  const openCreate = React.useCallback(() => setForm((f) => ({ key: f.key + 1, open: true, project: null })), [])

  const actionsFor = useProjectActions({
    onView: React.useCallback((project: Project) => router.push(`/projects/${project.id}`), [router]),
    onEdit: React.useCallback((project: Project) => setForm((f) => ({ key: f.key + 1, open: true, project })), []),
    onToggleStatus: React.useCallback(
      (project: Project) =>
        toggleStatus(project.id, {
          onSuccess: (updated) => toast.success(updated.status === 'active' ? t('status.activated') : t('status.deactivated')),
          onError: (error) => {
            const apiError = toApiError(error)
            toast.error(t('status.failed'), apiError.status === 0 ? undefined : (apiError.fieldErrors.project ?? apiError.message))
          },
        }),
      [toggleStatus, t],
    ),
    onDelete: React.useCallback((project: Project) => {
      setDeleteError(null)
      setDeleting(project)
    }, []),
  })

  const columns = useProjectColumns(actionsFor)

  const confirmDelete = () => {
    if (!deleting) return
    remove.mutate(deleting.id, {
      onSuccess: () => {
        setDeleting(null)
        toast.success(t('delete.deleted'))
      },
      onError: (error) => setDeleteError(toApiError(error).message),
    })
  }

  // A page past the end (e.g. after deleting the last row of the last page) → the last page.
  const data = projects.data
  const lastPage = data?.meta.last_page
  React.useEffect(() => {
    if (lastPage !== undefined && !projects.isPlaceholderData && state.page > lastPage) setPage(lastPage)
  }, [lastPage, projects.isPlaceholderData, state.page, setPage])

  const empty =
    projects.isError && !data ? (
      <EmptyState
        icon={CircleAlert}
        tone="danger"
        title={t('empty.errorTitle')}
        description={toApiError(projects.error).message}
        action={
          <Button variant="outline" onClick={() => projects.refetch()}>
            {t('empty.retry')}
          </Button>
        }
      />
    ) : list.isFiltered ? (
      <EmptyState
        icon={Search}
        title={t('empty.noMatchTitle')}
        description={t('empty.noMatchDescription')}
        action={
          <Button variant="outline" onClick={list.reset}>
            {t('empty.clearFilters')}
          </Button>
        }
      />
    ) : (
      <EmptyState
        icon={Folder}
        title={t('empty.title')}
        description={t('empty.description')}
        action={
          <Button onClick={openCreate}>
            <Plus className="size-icon" aria-hidden="true" />
            {t('add')}
          </Button>
        }
      />
    )

  const footer = data ? (
    <Pagination
      page={data.meta.current_page}
      perPage={data.meta.per_page}
      total={data.meta.total}
      onPageChange={list.setPage}
      onPerPageChange={list.setPerPage}
    />
  ) : null

  const busy = projects.isFetching && projects.isPlaceholderData

  return (
    <>
      <PageHeader
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus className="size-icon" aria-hidden="true" />
            {t('add')}
          </Button>
        }
      />

      <div className="mt-4 flex flex-col gap-4">
        <ProjectStats stats={stats.data} />

        <FilterBar
          density="compact"
          search={state.search}
          onSearchChange={list.setSearch}
          defaultAdvancedOpen={state.filters.created_from !== '' || state.filters.created_to !== ''}
          advanced={<ProjectCreatedFilter filters={state.filters} onChange={list.setFilter} />}
          onReset={list.reset}
          canReset={list.isFiltered}
          actions={
            <ViewToggle value={view} onValueChange={setView} label={t('view.label')} listLabel={t('view.list')} gridLabel={t('view.grid')} />
          }
        >
          <ProjectPriorityFilter filters={state.filters} onChange={list.setFilter} />
          <ProjectClientFilter filters={state.filters} onChange={list.setFilter} />
        </FilterBar>

        <ProjectStatusTabs status={state.filters.status} onStatusChange={(status) => list.setFilter('status', status)} stats={stats.data} />

        <TabPanel idBase={PROJECT_STATUS_TABS_ID} value={state.filters.status || 'all'} className="rounded-xl">
          {view === 'grid' ? (
            <CardGrid
              label={t('gridLabel')}
              items={data?.data}
              getId={(project) => project.id}
              renderCard={(project) => <ProjectCard project={project} actions={actionsFor(project)} />}
              renderSkeleton={() => <ProjectCardSkeleton />}
              skeletonCount={Math.min(state.perPage, 6)}
              loading={projects.isPending}
              busy={busy}
              empty={empty}
              footer={footer}
            />
          ) : (
            <DataTable
              density="relaxed"
              label={t('tableLabel')}
              columns={columns}
              rows={data?.data}
              getRowId={(project) => project.id}
              sort={state.sort}
              onSortChange={list.setSort}
              rowNumberOffset={((data?.meta.current_page ?? state.page) - 1) * (data?.meta.per_page ?? state.perPage)}
              loading={projects.isPending}
              skeletonRows={Math.min(state.perPage, 10)}
              busy={busy}
              empty={empty}
              footer={footer}
            />
          )}
        </TabPanel>
      </div>

      <ProjectFormModal
        key={form.key}
        open={form.open}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
        project={form.project}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title={t('delete.title')}
        description={deleting ? t('delete.body', { name: deleting.name }) : ''}
        confirmLabel={t('delete.confirm')}
        cancelLabel={t('dialog.cancel')}
        closeLabel={t('dialog.close')}
        onConfirm={confirmDelete}
        pending={remove.isPending}
        error={deleteError}
      />
    </>
  )
}
