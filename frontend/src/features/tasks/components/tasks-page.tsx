'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CircleAlert, Columns2, Folder, Layers, List, Plus, Search, SquareCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { PageHeader } from '@/components/layout/app-shell'
import { DataTable } from '@/components/shared/data-table'
import { FilterBar } from '@/components/shared/filter-bar'
import type { KanbanMove } from '@/components/shared/kanban-board'
import { Pagination } from '@/components/shared/pagination'
import { TabPanel } from '@/components/shared/tabs'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { EmptyState } from '@/components/ui/empty-state'
import { toast } from '@/components/ui/toast'
import { Tooltip } from '@/components/ui/tooltip'
import { ViewToggle } from '@/components/ui/view-toggle'
import { toApiError } from '@/lib/api-error'
import { useProjectStats } from '@/features/projects/api'
import { useTaskStages } from '@/features/task-stages/api'
import { useDeleteTask, useMoveTask, useTaskBoard, useTasks, useTaskStats } from '@/features/tasks/api'
import { useTaskActions } from '@/features/tasks/components/task-actions'
import { TaskBoard, TaskBoardSkeleton } from '@/features/tasks/components/task-board'
import { useTaskColumns } from '@/features/tasks/components/task-columns'
import { TaskFormModal } from '@/features/tasks/components/task-form-modal'
import { TaskMilestoneFilter, TaskProjectFilter, TaskStageFilter } from '@/features/tasks/components/task-filters'
import { TASK_PRIORITY_TABS_ID, TaskPriorityTabs } from '@/features/tasks/components/task-priority-tabs'
import { TaskStats } from '@/features/tasks/components/task-stats'
import type { Task } from '@/features/tasks/types'
import { useTaskListParams, type TaskView } from '@/features/tasks/use-task-list-params'

/* /tasks — PAGE SPEC A and the Tasks screenshot: the header (title, subtitle, green
   "+ Add Task"), the four stat cards, the filter card (search · All Projects · All Milestones —
   greyed until a project is chosen · All Stages · Filters · the board/list toggle) with the
   priority tabs on its bottom edge, then the Kanban board (or the list). All page state — the
   tab, the selects, the view — lives in the URL.
   Board: drag a card to another column or within one (mouse, touch, keyboard); the move is
   optimistic and rolls back with a toast if the server refuses. While a search, a tab or a
   select narrows the board, dragging is off and a note says why — a filtered column is only
   part of the sequence the move rewrites.
   States: skeleton columns; no projects yet / no active stages (pointing at those pages
   instead of an unusable board); no tasks yet (with Add Task); nothing matching (with a reset);
   a failed load (with Try again).
   Add (the header, the empty board) and Edit (a card's menu, a row) open TaskFormModal — a
   fresh form per opening; Add pre-selects the project / stage the page is filtered on. View
   (a card's menu, a row's eye) opens the details page /tasks/{id}. */

type FormState = { key: number; open: boolean; task: Task | null }

export function TasksPage() {
  const t = useTranslations('tasks.list')
  const tShared = useTranslations('shared')
  const router = useRouter()
  const list = useTaskListParams()
  const { state, view, setView, setProject, boardParams, listParams, isFiltered, setPage } = list

  const stats = useTaskStats()
  const projectStats = useProjectStats()
  const activeStages = useTaskStages({ status: 'active' })
  const board = useTaskBoard(boardParams, { enabled: view === 'board' })
  const tasks = useTasks(listParams, { enabled: view === 'list' })
  const move = useMoveTask(boardParams)
  const remove = useDeleteTask()

  const [form, setForm] = React.useState<FormState>({ key: 0, open: false, task: null })
  const openCreate = React.useCallback(() => setForm((f) => ({ key: f.key + 1, open: true, task: null })), [])

  const [deleting, setDeleting] = React.useState<Task | null>(null)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)

  const actionsFor = useTaskActions({
    onView: React.useCallback((task: Task) => router.push(`/tasks/${task.id}`), [router]),
    onEdit: React.useCallback((task: Task) => setForm((f) => ({ key: f.key + 1, open: true, task })), []),
    onDelete: React.useCallback((task: Task) => {
      setDeleteError(null)
      setDeleting(task)
    }, []),
  })
  const columns = useTaskColumns(actionsFor)

  const onMove = React.useCallback(
    ({ itemId, toColumnId, toIndex }: KanbanMove<number, number>) =>
      move.mutate(
        { taskId: itemId, stageId: toColumnId, position: toIndex + 1 },
        { onError: (error) => toast.error(t('move.failed'), toApiError(error).message) },
      ),
    [move, t],
  )

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

  // List: a page past the end (after deleting the last row of the last page) → the last page.
  const page = tasks.data
  const lastPage = page?.meta.last_page
  React.useEffect(() => {
    if (view === 'list' && lastPage !== undefined && !tasks.isPlaceholderData && state.page > lastPage) setPage(lastPage)
  }, [view, lastPage, tasks.isPlaceholderData, state.page, setPage])

  const addButton = (size?: 'sm') => <AddTaskButton size={size} label={t('add')} comingSoon={tShared('comingSoon')} onAdd={openCreate} />

  /* ── What the content area shows ── */

  const noProjects = projectStats.data?.total === 0 && stats.data?.total === 0
  const noStages = activeStages.data?.length === 0

  const guidance = noProjects ? (
    <EmptyState
      framed
      icon={Folder}
      title={t('empty.noProjectsTitle')}
      description={t('empty.noProjectsDescription')}
      action={
        <Button asChild>
          <Link href="/projects">{t('empty.goToProjects')}</Link>
        </Button>
      }
    />
  ) : view === 'board' && noStages ? (
    <EmptyState
      framed
      icon={Layers}
      title={t('empty.noStagesTitle')}
      description={t('empty.noStagesDescription')}
      action={
        <Button asChild>
          <Link href="/configuration/task-stages">{t('empty.goToStages')}</Link>
        </Button>
      }
    />
  ) : null

  const loadError = (query: { error: unknown; refetch: () => unknown }) => (
    <EmptyState
      icon={CircleAlert}
      tone="danger"
      title={t('empty.errorTitle')}
      description={toApiError(query.error).message}
      action={
        <Button variant="outline" onClick={() => query.refetch()}>
          {t('empty.retry')}
        </Button>
      }
    />
  )
  const noMatch = (
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
  )
  const noTasks = <EmptyState icon={SquareCheck} title={t('empty.title')} description={t('empty.description')} action={addButton()} />

  const onlyStageId = state.filters.task_stage_id ? Number(state.filters.task_stage_id) : undefined
  const boardData = board.data
  const boardEmpty =
    boardData !== undefined &&
    boardData.columns.every((column) => (onlyStageId !== undefined && column.stage.id !== onlyStageId) || column.tasks.length === 0)

  let content: React.ReactNode
  if (guidance) {
    content = guidance
  } else if (view === 'board') {
    if (board.isError && !boardData) content = <div className="rounded-xl border border-border bg-card">{loadError(board)}</div>
    else if (!boardData) content = <TaskBoardSkeleton />
    else if (boardEmpty) content = <div className="rounded-xl border border-border bg-card">{isFiltered ? noMatch : noTasks}</div>
    else
      content = (
        <div className="flex flex-col gap-3" aria-busy={(board.isFetching && board.isPlaceholderData) || undefined}>
          {isFiltered ? (
            <Alert tone="info">
              <span>{t('dragDisabled')}</span>{' '}
              <button type="button" onClick={list.reset} className="font-medium underline underline-offset-2 focus-visible:shadow-focus focus-visible:outline-none">
                {t('clearToDrag')}
              </button>
            </Alert>
          ) : null}
          <TaskBoard board={boardData} actionsFor={actionsFor} onMove={onMove} disabled={isFiltered} onlyStageId={onlyStageId} />
        </div>
      )
  } else {
    content = (
      <DataTable
        density="relaxed"
        label={t('tableLabel')}
        columns={columns}
        rows={page?.data}
        getRowId={(task) => task.id}
        sort={state.sort}
        onSortChange={list.setSort}
        rowNumberOffset={((page?.meta.current_page ?? state.page) - 1) * (page?.meta.per_page ?? state.perPage)}
        loading={tasks.isPending}
        skeletonRows={Math.min(state.perPage, 10)}
        busy={tasks.isFetching && tasks.isPlaceholderData}
        empty={tasks.isError && !page ? loadError(tasks) : isFiltered ? noMatch : noTasks}
        footer={
          page ? (
            <Pagination
              page={page.meta.current_page}
              perPage={page.meta.per_page}
              total={page.meta.total}
              onPageChange={list.setPage}
              onPerPageChange={list.setPerPage}
            />
          ) : null
        }
      />
    )
  }

  return (
    <>
      <PageHeader title={t('title')} subtitle={t('subtitle')} action={addButton('sm')} />

      <div className="mt-4 flex flex-col gap-4">
        <TaskStats stats={stats.data} />

        <FilterBar
          density="compact"
          search={state.search}
          onSearchChange={list.setSearch}
          advanced={<p className="text-body-sm text-muted-foreground">{t('filters.panelNote')}</p>}
          onReset={list.reset}
          canReset={isFiltered}
          actions={
            <ViewToggle<TaskView>
              value={view}
              onValueChange={setView}
              label={t('view.label')}
              options={[
                { value: 'board', icon: Columns2, label: t('view.board') },
                { value: 'list', icon: List, label: t('view.list') },
              ]}
            />
          }
          footer={
            <TaskPriorityTabs
              priority={state.filters.priority}
              onPriorityChange={(priority) => list.setFilter('priority', priority)}
              stats={stats.data}
            />
          }
        >
          <TaskProjectFilter value={state.filters.project_id} onChange={setProject} />
          <TaskMilestoneFilter
            projectId={state.filters.project_id}
            value={state.filters.milestone_id}
            onChange={(milestoneId) => list.setFilter('milestone_id', milestoneId)}
          />
          <TaskStageFilter value={state.filters.task_stage_id} onChange={(stageId) => list.setFilter('task_stage_id', stageId)} />
        </FilterBar>

        <TabPanel idBase={TASK_PRIORITY_TABS_ID} value={state.filters.priority || 'all'} className="rounded-xl">
          {content}
        </TabPanel>
      </div>

      <TaskFormModal
        key={form.key}
        open={form.open}
        onOpenChange={(open) => setForm((f) => ({ ...f, open }))}
        task={form.task}
        defaults={{ project_id: state.filters.project_id, task_stage_id: state.filters.task_stage_id }}
      />

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title={t('delete.title')}
        description={deleting ? t('delete.body', { title: deleting.title }) : ''}
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

/** "+ Add Task": opens the task modal ("Coming soon" without a handler). */
function AddTaskButton({ size, label, comingSoon, onAdd }: { size?: 'sm'; label: string; comingSoon: string; onAdd?: () => void }) {
  const button = (
    <Button size={size} onClick={onAdd} disabled={!onAdd}>
      <Plus className="size-icon" aria-hidden="true" />
      {label}
    </Button>
  )
  if (onAdd) return button
  // A disabled button fires no pointer events, so the tooltip rides on a wrapper.
  return (
    <Tooltip content={comingSoon}>
      <span className="inline-flex">{button}</span>
    </Tooltip>
  )
}
