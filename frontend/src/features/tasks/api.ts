'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Paginated } from '@/lib/paginated'
import type { Resource } from '@/features/auth/types'
import { projectKeys } from '@/features/projects/api'
import { taskStageKeys } from '@/features/task-stages/api'
import { moveOnBoard, type TaskMove } from '@/features/tasks/board'
import type {
  ResourceList,
  Task,
  TaskBoard,
  TaskBoardParams,
  TaskChecklistItem,
  TaskChecklistItemPayload,
  TaskDetail,
  TaskFile,
  TaskListParams,
  TaskPayload,
  TaskStats,
} from '@/features/tasks/types'

export type { TaskMove } from '@/features/tasks/board'

/* The signed-in company's tasks (all through the shared axios client):
   GET|POST /api/v1/tasks (`view=board` | `view=list`) · GET …/stats · GET|PUT|DELETE …/{id} ·
   PATCH …/{id}/move
   GET|POST /api/v1/tasks/{id}/checklist-items · PATCH …/checklist-items/reorder ·
   PUT|DELETE /api/v1/task-checklist-items/{id}
   GET|POST /api/v1/tasks/{id}/files (attach a media id) · DELETE /api/v1/task-files/{id}
   The server scopes everything to the company (BelongsToCompany; another company's id is a
   404) and owns every rule (done stage → 100% and completed, positions) — nothing here sends a
   company id.

   Cache keys: ['tasks', 'board', params] · ['tasks', 'list', params] · ['tasks', 'stats'] ·
   ['tasks', 'detail', id] with its tabs nested under it (…, 'checklist' / 'files'), so
   invalidating the detail prefix refreshes the info cards, the tab counts and the open tab.
   - task create / update / move / delete → the boards, the lists, the stats, that task, and —
     since a project's progress, health and Total Tasks come from its tasks — the affected
     projects' details and the projects list, plus the task stages (their task counts);
   - checklist and file writes → that task's details (summary, counts) and the tab;
   - the move and the checklist toggle / reorder are optimistic and roll back on failure;
   - writes invalidate even when refused, so a stale screen never fights the server.
   Errors reach the caller untouched (toApiError(error).message for its toast or form). */

export type TaskTabKey = 'checklist' | 'files'

export const taskKeys = {
  all: ['tasks'] as const,
  boards: ['tasks', 'board'] as const,
  board: (params: TaskBoardParams) => ['tasks', 'board', params] as const,
  lists: ['tasks', 'list'] as const,
  list: (params: TaskListParams) => ['tasks', 'list', params] as const,
  stats: ['tasks', 'stats'] as const,
  details: ['tasks', 'detail'] as const,
  detail: (id: number) => ['tasks', 'detail', id] as const,
  tab: (id: number, tab: TaskTabKey) => ['tasks', 'detail', id, tab] as const,
}

const TASKS = '/api/v1/tasks'
const taskPath = (id: number) => `${TASKS}/${id}`
const isId = (id: number | null | undefined): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0

/* ── Reads ── */

/** The Kanban board: every active stage in order, each with its matching tasks (not paginated).
 *  The previous board stays on screen while a new filter loads. */
export function useTaskBoard(params: TaskBoardParams, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: taskKeys.board(params),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Resource<TaskBoard>>(TASKS, { params: { ...params, view: 'board' }, signal })
      return data.data
    },
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  })
}

/** One page of the list view. The previous page stays on screen while the next one loads. */
export function useTasks(params: TaskListParams, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: taskKeys.list(params),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Paginated<Task>>(TASKS, { params: { ...params, view: 'list' }, signal })
      return data
    },
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  })
}

/** The four stat cards and the five priority tab counts. */
export function useTaskStats() {
  return useQuery({
    queryKey: taskKeys.stats,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Resource<TaskStats>>(`${TASKS}/stats`, { signal })
      return data.data
    },
  })
}

/** The details page, seeded from the server render when given. A missing, deleted or
 *  other-company id answers 404 (the caller shows not-found). */
export function useTask(id: number | null, options: { initialData?: TaskDetail } = {}) {
  return useQuery({
    queryKey: taskKeys.detail(id ?? 0),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Resource<TaskDetail>>(taskPath(id ?? 0), { signal })
      return data.data
    },
    enabled: isId(id),
    initialData: options.initialData,
  })
}

/* ── Task writes ── */

/** A task's project as this screen last saw it (details, a board or a list page), if any. */
function cachedProjectId(queryClient: QueryClient, id: number): number | undefined {
  const detail = queryClient.getQueryData<TaskDetail>(taskKeys.detail(id))
  if (detail) return detail.project_id
  for (const [, board] of queryClient.getQueriesData<TaskBoard>({ queryKey: taskKeys.boards })) {
    for (const column of board?.columns ?? []) {
      const task = column.tasks.find((entry) => entry.id === id)
      if (task) return task.project_id
    }
  }
  for (const [, page] of queryClient.getQueriesData<Paginated<Task>>({ queryKey: taskKeys.lists })) {
    const task = page?.data.find((entry) => entry.id === id)
    if (task) return task.project_id
  }
  return undefined
}

/** After a task write: the task views, the stage counts, and the projects whose figures moved
 *  (every project's details when the old one is unknown). */
function useInvalidateTasks() {
  const queryClient = useQueryClient()
  return async ({ taskId, projectIds = [] }: { taskId?: number; projectIds?: ReadonlyArray<number | undefined> } = {}) => {
    const known = [...new Set(projectIds.filter(isId))]
    const unknown = projectIds.some((id) => !isId(id))
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: taskKeys.boards }),
      queryClient.invalidateQueries({ queryKey: taskKeys.lists }),
      queryClient.invalidateQueries({ queryKey: taskKeys.stats }),
      taskId === undefined ? Promise.resolve() : queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) }),
      queryClient.invalidateQueries({ queryKey: projectKeys.lists }),
      ...(unknown
        ? [queryClient.invalidateQueries({ queryKey: projectKeys.details })]
        : known.map((id) => queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) }))),
      queryClient.invalidateQueries({ queryKey: taskStageKeys.lists }),
      queryClient.invalidateQueries({ queryKey: taskStageKeys.details }),
    ])
  }
}

/** 201 — the task lands at the end of its stage column. */
export function useCreateTask() {
  const invalidate = useInvalidateTasks()
  return useMutation({
    mutationFn: async (payload: TaskPayload) => {
      const { data } = await api.post<Resource<TaskDetail>>(TASKS, payload)
      return data.data
    },
    onSettled: async (_task, _error, payload) => invalidate({ projectIds: [payload.project_id] }),
  })
}

/** Both the old and the new project's figures refresh when the project changes. */
export function useUpdateTask(id: number) {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateTasks()
  return useMutation({
    onMutate: () => ({ previousProjectId: cachedProjectId(queryClient, id) }),
    mutationFn: async (payload: TaskPayload) => {
      const { data } = await api.put<Resource<TaskDetail>>(taskPath(id), payload)
      return data.data
    },
    onSuccess: (task) => {
      queryClient.setQueryData(taskKeys.detail(id), task)
    },
    onSettled: async (_task, _error, payload, context) =>
      invalidate({ taskId: id, projectIds: [payload.project_id, context?.previousProjectId] }),
  })
}

/** Soft-deletes the task with its checklist and file links (the media stay). Its cached
 *  details are dropped — the id is a 404 from now on. */
export function useDeleteTask() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateTasks()
  return useMutation({
    onMutate: (id: number) => ({ projectId: cachedProjectId(queryClient, id) }),
    mutationFn: async (id: number) => {
      await api.delete(taskPath(id))
      return id
    },
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: taskKeys.detail(id) })
    },
    onSettled: async (_id, _error, _vars, context) => invalidate({ projectIds: [context?.projectId] }),
  })
}

/** The drag: optimistic on the board being dragged (`params` — the unfiltered board), rolled
 *  back if the server refuses (an inactive stage, a task deleted meanwhile → the caller toasts). */
export function useMoveTask(params: TaskBoardParams) {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateTasks()
  const key = taskKeys.board(params)

  return useMutation({
    mutationFn: async (move: TaskMove) => {
      const { data } = await api.patch<Resource<TaskDetail>>(`${taskPath(move.taskId)}/move`, {
        task_stage_id: move.stageId,
        position: move.position,
      })
      return data.data
    },
    onMutate: async (move) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<TaskBoard>(key)
      const projectId = cachedProjectId(queryClient, move.taskId)
      if (previous) queryClient.setQueryData<TaskBoard>(key, moveOnBoard(previous, move))
      return { previous, projectId }
    },
    onError: (_error, _move, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: async (_task, _error, move, context) => invalidate({ taskId: move.taskId, projectIds: [context?.projectId] }),
  })
}

/* ── Checklist ── */

/** After a checklist write: the task's details (the Checklist (n) count) and the list. */
function useInvalidateTask() {
  const queryClient = useQueryClient()
  return async (taskId: number) => queryClient.invalidateQueries({ queryKey: taskKeys.detail(taskId) })
}

/** The task's checklist, in its order (not paginated). */
export function useTaskChecklist(taskId: number | null, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: taskKeys.tab(taskId ?? 0, 'checklist'),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<ResourceList<TaskChecklistItem>>(`${taskPath(taskId ?? 0)}/checklist-items`, { signal })
      return data.data
    },
    enabled: (options.enabled ?? true) && isId(taskId),
  })
}

/** 201 — added at the end of the list. Independent of the task's progress (business rule 9). */
export function useCreateChecklistItem(taskId: number) {
  const invalidate = useInvalidateTask()
  return useMutation({
    mutationFn: async (payload: Required<Pick<TaskChecklistItemPayload, 'title'>> & TaskChecklistItemPayload) => {
      const { data } = await api.post<Resource<TaskChecklistItem>>(`${taskPath(taskId)}/checklist-items`, payload)
      return data.data
    },
    onSettled: async () => invalidate(taskId),
  })
}

/** Rename and/or tick — optimistic (the checkbox flips at once), rolled back on failure. */
export function useUpdateChecklistItem(taskId: number) {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateTask()
  const key = taskKeys.tab(taskId, 'checklist')

  return useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: TaskChecklistItemPayload }) => {
      const { data } = await api.put<Resource<TaskChecklistItem>>(`/api/v1/task-checklist-items/${id}`, payload)
      return data.data
    },
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<TaskChecklistItem[]>(key)
      if (previous) {
        queryClient.setQueryData<TaskChecklistItem[]>(
          key,
          previous.map((item) => (item.id === id ? { ...item, ...payload, title: payload.title?.trim() ?? item.title } : item)),
        )
      }
      return { previous }
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: async () => invalidate(taskId),
  })
}

export function useDeleteChecklistItem(taskId: number) {
  const invalidate = useInvalidateTask()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/v1/task-checklist-items/${id}`)
      return id
    },
    onSettled: async () => invalidate(taskId),
  })
}

/** Every item id in the new order — optimistic, rolled back on failure (a 422 when the list
 *  changed meanwhile: the refetch then shows the server's list). */
export function useReorderChecklist(taskId: number) {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateTask()
  const key = taskKeys.tab(taskId, 'checklist')

  return useMutation({
    mutationFn: async (ids: number[]) => {
      const { data } = await api.patch<ResourceList<TaskChecklistItem>>(`${taskPath(taskId)}/checklist-items/reorder`, { ids })
      return data.data
    },
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: key })
      const previous = queryClient.getQueryData<TaskChecklistItem[]>(key)
      if (previous) {
        const byId = new Map(previous.map((item) => [item.id, item]))
        const reordered = ids.map((id) => byId.get(id)).filter((item): item is TaskChecklistItem => item !== undefined)
        if (reordered.length === previous.length) {
          queryClient.setQueryData<TaskChecklistItem[]>(
            key,
            reordered.map((item, index) => ({ ...item, position: index + 1 })),
          )
        }
      }
      return { previous }
    },
    onError: (_error, _ids, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous)
    },
    onSettled: async () => invalidate(taskId),
  })
}

/* ── Files ── */

/** Media attached to the task (not paginated). */
export function useTaskFiles(taskId: number | null, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: taskKeys.tab(taskId ?? 0, 'files'),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<ResourceList<TaskFile>>(`${taskPath(taskId ?? 0)}/files`, { signal })
      return data.data
    },
    enabled: (options.enabled ?? true) && isId(taskId),
  })
}

/** Attach a media file: idempotent — `created` is false when it was already attached (200). */
export function useAttachTaskFile(taskId: number) {
  const invalidate = useInvalidateTask()
  return useMutation({
    mutationFn: async (mediaId: number) => {
      const response = await api.post<Resource<TaskFile>>(`${taskPath(taskId)}/files`, { media_id: mediaId })
      return { file: response.data.data, created: response.status === 201 }
    },
    onSettled: async () => invalidate(taskId),
  })
}

/** Detach: removes the link only — the file stays in the media library. */
export function useDetachTaskFile(taskId: number) {
  const invalidate = useInvalidateTask()
  return useMutation({
    mutationFn: async (fileId: number) => {
      await api.delete(`/api/v1/task-files/${fileId}`)
      return fileId
    },
    onSettled: async () => invalidate(taskId),
  })
}
