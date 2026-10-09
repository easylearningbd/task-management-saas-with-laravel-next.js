'use client'

import { useMutation, useQuery, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Resource } from '@/features/auth/types'
import type {
  TaskStage,
  TaskStageList,
  TaskStageListParams,
  TaskStagePayload,
  TaskStageStats,
} from '@/features/task-stages/types'

/* The signed-in company's task stages (all through the shared axios client):
   GET|POST /api/v1/task-stages · GET …/stats · PATCH …/reorder ·
   GET|PUT|DELETE …/{id} · PATCH …/{id}/toggle-status
   The server scopes everything to the company (BelongsToCompany) and owns every workflow rule;
   nothing here sends a company id. Every write invalidates the lists, the stats and that
   stage's detail. Reorder and toggle are optimistic and roll back on failure; their errors —
   including the rule refusals ("The done stage can't be deactivated…") — reach the caller's
   onError untouched (toApiError(error).message). */

export const taskStageKeys = {
  all: ['task-stages'] as const,
  lists: ['task-stages', 'list'] as const,
  list: (params: TaskStageListParams) => ['task-stages', 'list', params] as const,
  stats: ['task-stages', 'stats'] as const,
  details: ['task-stages', 'detail'] as const,
  detail: (id: number) => ['task-stages', 'detail', id] as const,
}

const endpoint = (id?: number) => (id === undefined ? '/api/v1/task-stages' : `/api/v1/task-stages/${id}`)

/** The whole workflow (filtered when asked), in stage order. */
export function useTaskStages(params: TaskStageListParams) {
  return useQuery({
    queryKey: taskStageKeys.list(params),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<TaskStageList>(endpoint(), { params, signal })
      return data.data
    },
  })
}

/** The stat cards: totals and the done stage. */
export function useTaskStageStats() {
  return useQuery({
    queryKey: taskStageKeys.stats,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Resource<TaskStageStats>>(`${endpoint()}/stats`, { signal })
      return data.data
    },
  })
}

/** One stage (the details modal), seeded from the list when given, then refreshed. */
export function useTaskStage(id: number | null, options: { enabled?: boolean; initialData?: TaskStage } = {}) {
  return useQuery({
    queryKey: taskStageKeys.detail(id ?? 0),
    queryFn: async () => {
      const { data } = await api.get<Resource<TaskStage>>(endpoint(id ?? 0))
      return data.data
    },
    enabled: (options.enabled ?? true) && id !== null && Number.isInteger(id) && id > 0,
    initialData: options.initialData,
  })
}

/** After any write: every list, the stats and (if given) that stage's detail are stale. A
 *  write can move other stages (order, the done flag), so every detail goes stale on writes
 *  that reshape the workflow. */
function useInvalidateTaskStages() {
  const queryClient = useQueryClient()
  return async (options: { id?: number; allDetails?: boolean } = {}) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: taskStageKeys.lists }),
      queryClient.invalidateQueries({ queryKey: taskStageKeys.stats }),
      options.allDetails
        ? queryClient.invalidateQueries({ queryKey: taskStageKeys.details })
        : options.id === undefined
          ? Promise.resolve()
          : queryClient.invalidateQueries({ queryKey: taskStageKeys.detail(options.id) }),
    ])
  }
}

export function useCreateTaskStage() {
  const invalidate = useInvalidateTaskStages()

  return useMutation({
    mutationFn: async (payload: TaskStagePayload) => {
      const { data } = await api.post<Resource<TaskStage>>(endpoint(), payload)
      return data.data
    },
    // An insert renumbers others and may take the done flag: everything is stale.
    onSuccess: async () => invalidate({ allDetails: true }),
    // A refusal usually means this screen's picture of the workflow is out of date (the done
    // flag moved elsewhere): re-read it, so the cards show what the server holds.
    onError: async () => invalidate({ allDetails: true }),
  })
}

export function useUpdateTaskStage(id: number) {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateTaskStages()

  return useMutation({
    mutationFn: async (payload: TaskStagePayload) => {
      const { data } = await api.put<Resource<TaskStage>>(endpoint(id), payload)
      return data.data
    },
    onSuccess: async (stage) => {
      queryClient.setQueryData(taskStageKeys.detail(id), stage)
      await invalidate({ allDetails: true })
    },
    // As for create: after a refusal, re-read the workflow.
    onError: async () => invalidate({ allDetails: true }),
  })
}

/** Soft-deletes; the stages after it move up, so every detail is stale. */
export function useDeleteTaskStage() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateTaskStages()

  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(endpoint(id))
      return id
    },
    onSuccess: async (id) => {
      queryClient.removeQueries({ queryKey: taskStageKeys.detail(id) })
      await invalidate({ allDetails: true })
    },
  })
}

type Snapshot = Array<[QueryKey, unknown]>

function snapshot(queryClient: ReturnType<typeof useQueryClient>, extra: QueryKey[] = []): Snapshot {
  return [
    ...queryClient.getQueriesData({ queryKey: taskStageKeys.lists }),
    [taskStageKeys.stats, queryClient.getQueryData(taskStageKeys.stats)],
    ...extra.map((key): [QueryKey, unknown] => [key, queryClient.getQueryData(key)]),
  ]
}

function restore(queryClient: ReturnType<typeof useQueryClient>, previous: Snapshot | undefined) {
  previous?.forEach(([key, data]) => queryClient.setQueryData(key, data))
}

const flipStatus = (stage: TaskStage): TaskStage =>
  stage.status === 'active'
    ? { ...stage, status: 'inactive', status_label: 'Inactive' }
    : { ...stage, status: 'active', status_label: 'Active' }

/**
 * The lock icon: flips the status at once in every cached list, the stats and the detail;
 * restores them all if the server refuses (the done stage, the last active stage) or fails,
 * and refetches either way. (The optimistic label is replaced by the server's on refetch.)
 */
export function useToggleTaskStageStatus() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateTaskStages()

  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.patch<Resource<TaskStage>>(`${endpoint(id)}/toggle-status`)
      return data.data
    },
    onMutate: async (id): Promise<{ previous: Snapshot }> => {
      await queryClient.cancelQueries({ queryKey: taskStageKeys.all })
      const previous = snapshot(queryClient, [taskStageKeys.detail(id)])
      let becameActive: boolean | null = null
      queryClient.setQueriesData<TaskStage[]>({ queryKey: taskStageKeys.lists }, (stages) =>
        stages?.map((stage) => {
          if (stage.id !== id) return stage
          becameActive = stage.status === 'inactive'
          return flipStatus(stage)
        }),
      )
      queryClient.setQueryData<TaskStage>(taskStageKeys.detail(id), (stage) => (stage ? flipStatus(stage) : stage))
      if (becameActive !== null) {
        const delta = becameActive ? 1 : -1
        queryClient.setQueryData<TaskStageStats>(taskStageKeys.stats, (stats) =>
          stats ? { ...stats, active: stats.active + delta, inactive: stats.inactive - delta } : stats,
        )
      }
      return { previous }
    },
    onError: (_error, _id, context) => restore(queryClient, context?.previous),
    onSettled: async (_data, _error, id) => invalidate({ id }),
  })
}

/**
 * Drag-to-reorder: `ids` is every stage, in the new order. Each cached list that holds exactly
 * those stages is re-sorted at once (orders renumbered 1..n); the server rewrites the sequence;
 * on failure everything rolls back. Only an unfiltered list can be reordered (the page disables
 * dragging while filtered), so a partial list is never sent.
 */
export function useReorderTaskStages() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateTaskStages()

  return useMutation({
    mutationFn: async (ids: number[]) => {
      const { data } = await api.patch<TaskStageList>(`${endpoint()}/reorder`, { ids })
      return data.data
    },
    onMutate: async (ids): Promise<{ previous: Snapshot }> => {
      await queryClient.cancelQueries({ queryKey: taskStageKeys.all })
      const previous = snapshot(queryClient)
      const position = new Map(ids.map((id, index) => [id, index]))
      queryClient.setQueriesData<TaskStage[]>({ queryKey: taskStageKeys.lists }, (stages) => {
        if (!stages || stages.length !== ids.length || stages.some((stage) => !position.has(stage.id))) return stages
        return [...stages]
          .sort((a, b) => (position.get(a.id) ?? 0) - (position.get(b.id) ?? 0))
          .map((stage, index) => ({ ...stage, order: index + 1 }))
      })
      return { previous }
    },
    onError: (_error, _ids, context) => restore(queryClient, context?.previous),
    onSettled: async () => invalidate({ allDetails: true }),
  })
}
