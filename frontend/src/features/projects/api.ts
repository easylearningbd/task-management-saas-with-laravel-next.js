'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Paginated } from '@/lib/paginated'
import type { Resource } from '@/features/auth/types'
import { planUsageKeys } from '@/features/plan-usage/api'
import type {
  Expense,
  ExpensePayload,
  ExpenseStats,
  Milestone,
  MilestonePayload,
  Project,
  ProjectDetail,
  ProjectFile,
  ProjectItem,
  ProjectItemPayload,
  ProjectListParams,
  ProjectNote,
  ProjectNotePayload,
  ProjectPayload,
  ProjectStats,
  ResourceList,
} from '@/features/projects/types'

/* The signed-in company's projects and their tabs (all through the shared axios client):
   GET|POST /api/v1/projects · GET …/stats · GET|PUT|DELETE …/{id} · PATCH …/{id}/toggle-status
   GET|POST /api/v1/projects/{id}/milestones · PUT|DELETE /api/v1/milestones/{id}
   GET|POST /api/v1/projects/{id}/items      · PUT|DELETE /api/v1/project-items/{id}
   GET|POST /api/v1/projects/{id}/notes      · GET|PUT|DELETE /api/v1/project-notes/{id}
   GET|POST /api/v1/projects/{id}/expenses (+ GET …/expenses/stats) · PUT|DELETE /api/v1/expenses/{id}
   GET|POST /api/v1/projects/{id}/files (attach a media id) · DELETE /api/v1/project-files/{id}
   The server scopes everything to the company (BelongsToCompany; another company's id is a
   404) — nothing here sends a company id.

   Cache keys nest under the project: ['projects', 'detail', id] is the details payload and
   ['projects', 'detail', id, <tab>] each tab's list — so invalidating the detail prefix
   refreshes the summary cards, the tab counts, the Overview figures and the open tab together
   (only queries on screen refetch; the rest are just marked stale).
   - project create / update / delete / toggle → the lists, the stats, that project, plan usage
     (create and delete change the project count against the plan);
   - any tab write → that project (counts, figures, the tab itself);
   - writes invalidate even when refused, so a stale form never fights the server.
   Errors reach the caller untouched: a plan-limit 422 (code `plan_limit_reached`) is read with
   toApiError / isPlanLimitError by the form that made the request — never a global handler. */

export type ProjectTabKey = 'milestones' | 'items' | 'notes' | 'expenses' | 'files'

export const projectKeys = {
  all: ['projects'] as const,
  lists: ['projects', 'list'] as const,
  list: (params: ProjectListParams) => ['projects', 'list', params] as const,
  stats: ['projects', 'stats'] as const,
  details: ['projects', 'detail'] as const,
  detail: (id: number) => ['projects', 'detail', id] as const,
  tab: (id: number, tab: ProjectTabKey) => ['projects', 'detail', id, tab] as const,
  expenseStats: (id: number) => ['projects', 'detail', id, 'expenses', 'stats'] as const,
  note: (id: number, noteId: number) => ['projects', 'detail', id, 'notes', noteId] as const,
}

const PROJECTS = '/api/v1/projects'
const projectPath = (id: number) => `${PROJECTS}/${id}`
const isId = (id: number | null | undefined): id is number => typeof id === 'number' && Number.isInteger(id) && id > 0

/* ── Projects ── */

/** One page of the list. The previous page stays on screen while the next one loads. */
export function useProjects(params: ProjectListParams) {
  return useQuery({
    queryKey: projectKeys.list(params),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Paginated<Project>>(PROJECTS, { params, signal })
      return data
    },
    placeholderData: keepPreviousData,
  })
}

/** The four stat cards and the status tab counts. */
export function useProjectStats() {
  return useQuery({
    queryKey: projectKeys.stats,
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Resource<ProjectStats>>(`${PROJECTS}/stats`, { signal })
      return data.data
    },
  })
}

/** The details page: the project with its counts and computed figures, seeded from the
 *  server render when given. A missing, deleted or other-company id answers 404 (the caller
 *  shows not-found). */
export function useProject(id: number | null, options: { initialData?: ProjectDetail } = {}) {
  return useQuery({
    queryKey: projectKeys.detail(id ?? 0),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Resource<ProjectDetail>>(projectPath(id ?? 0), { signal })
      return data.data
    },
    enabled: isId(id),
    initialData: options.initialData,
  })
}

function useInvalidateProjects() {
  const queryClient = useQueryClient()
  return async (id?: number) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: projectKeys.lists }),
      queryClient.invalidateQueries({ queryKey: projectKeys.stats }),
      queryClient.invalidateQueries({ queryKey: planUsageKeys.all }),
      id === undefined ? Promise.resolve() : queryClient.invalidateQueries({ queryKey: projectKeys.detail(id) }),
    ])
  }
}

/** 201 — or 422 `plan_limit_reached` at the plan's project limit. */
export function useCreateProject() {
  const invalidate = useInvalidateProjects()
  return useMutation({
    mutationFn: async (payload: ProjectPayload) => {
      const { data } = await api.post<Resource<Project>>(PROJECTS, payload)
      return data.data
    },
    onSettled: async () => invalidate(),
  })
}

/** Never blocked by the plan limit. */
export function useUpdateProject(id: number) {
  const invalidate = useInvalidateProjects()
  return useMutation({
    mutationFn: async (payload: ProjectPayload) => {
      const { data } = await api.put<Resource<Project>>(projectPath(id), payload)
      return data.data
    },
    onSettled: async () => invalidate(id),
  })
}

/** Soft-deletes the project and its milestones, items, notes, expenses and file links (the
 *  media stays). Its cached detail and tabs are dropped — the id is a 404 from now on. */
export function useDeleteProject() {
  const queryClient = useQueryClient()
  const invalidate = useInvalidateProjects()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(projectPath(id))
      return id
    },
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: projectKeys.detail(id) })
    },
    onSettled: async () => invalidate(),
  })
}

/** The lock action: Active ⇄ Inactive. Completed and On Hold are refused with a 422 whose
 *  `errors.project` message the caller shows (the list also disables it via `can_toggle`). */
export function useToggleProjectStatus() {
  const invalidate = useInvalidateProjects()
  return useMutation({
    mutationFn: async (id: number) => {
      const { data } = await api.patch<Resource<Project>>(`${projectPath(id)}/toggle-status`)
      return data.data
    },
    onSettled: async (_data, _error, id) => invalidate(id),
  })
}

/* ── Tabs ── */

/** After a tab write: the project's details and every tab of it. */
function useInvalidateProject() {
  const queryClient = useQueryClient()
  return async (projectId: number) => queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) })
}

/** A project tab's whole list (a project's own records are few: not paginated). */
function useTabList<T>(projectId: number | null, tab: ProjectTabKey, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: projectKeys.tab(projectId ?? 0, tab),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<ResourceList<T>>(`${projectPath(projectId ?? 0)}/${tab}`, { signal })
      return data.data
    },
    enabled: (options.enabled ?? true) && isId(projectId),
  })
}

/** Create under the project, update / delete by the record's own path. */
function useTabWrites<T, P>(projectId: number, tab: Exclude<ProjectTabKey, 'files'>, recordPath: (id: number) => string) {
  const invalidate = useInvalidateProject()
  const settled = async () => invalidate(projectId)

  const create = useMutation({
    mutationFn: async (payload: P) => {
      const { data } = await api.post<Resource<T>>(`${projectPath(projectId)}/${tab}`, payload)
      return data.data
    },
    onSettled: settled,
  })
  const update = useMutation({
    mutationFn: async ({ id, payload }: { id: number; payload: P }) => {
      const { data } = await api.put<Resource<T>>(recordPath(id), payload)
      return data.data
    },
    onSettled: settled,
  })
  const remove = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(recordPath(id))
      return id
    },
    onSettled: settled,
  })

  return { create, update, remove }
}

// Milestones — in plan order (due date, then creation).
export const useMilestones = (projectId: number | null, options?: { enabled?: boolean }) =>
  useTabList<Milestone>(projectId, 'milestones', options)
export const useMilestoneWrites = (projectId: number) =>
  useTabWrites<Milestone, MilestonePayload>(projectId, 'milestones', (id) => `/api/v1/milestones/${id}`)

// Items — the project's own items (not a company catalog).
export const useProjectItems = (projectId: number | null, options?: { enabled?: boolean }) =>
  useTabList<ProjectItem>(projectId, 'items', options)
export const useProjectItemWrites = (projectId: number) =>
  useTabWrites<ProjectItem, ProjectItemPayload>(projectId, 'items', (id) => `/api/v1/project-items/${id}`)

// Notes — newest first, each with its author (set by the server).
export const useProjectNotes = (projectId: number | null, options?: { enabled?: boolean }) =>
  useTabList<ProjectNote>(projectId, 'notes', options)
export const useProjectNoteWrites = (projectId: number) =>
  useTabWrites<ProjectNote, ProjectNotePayload>(projectId, 'notes', (id) => `/api/v1/project-notes/${id}`)

/** One note with its full content (the view modal), seeded from the list card. */
export function useProjectNote(projectId: number, noteId: number | null, options: { initialData?: ProjectNote } = {}) {
  return useQuery({
    queryKey: projectKeys.note(projectId, noteId ?? 0),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Resource<ProjectNote>>(`/api/v1/project-notes/${noteId ?? 0}`, { signal })
      return data.data
    },
    enabled: isId(projectId) && isId(noteId),
    initialData: options.initialData,
  })
}

// Expenses — newest date first, each with its category (name + colour).
export const useExpenses = (projectId: number | null, options?: { enabled?: boolean }) =>
  useTabList<Expense>(projectId, 'expenses', options)
export const useExpenseWrites = (projectId: number) =>
  useTabWrites<Expense, ExpensePayload>(projectId, 'expenses', (id) => `/api/v1/expenses/${id}`)

/** The Expenses tab's two stat cards (count, exact total). */
export function useExpenseStats(projectId: number | null) {
  return useQuery({
    queryKey: projectKeys.expenseStats(projectId ?? 0),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Resource<ExpenseStats>>(`${projectPath(projectId ?? 0)}/expenses/stats`, { signal })
      return data.data
    },
    enabled: isId(projectId),
  })
}

// Files — media attached to the project.
export const useProjectFiles = (projectId: number | null, options?: { enabled?: boolean }) =>
  useTabList<ProjectFile>(projectId, 'files', options)

/** Attach a media file: idempotent — `created` is false when it was already attached (200). */
export function useAttachProjectFile(projectId: number) {
  const invalidate = useInvalidateProject()
  return useMutation({
    mutationFn: async (mediaId: number) => {
      const response = await api.post<Resource<ProjectFile>>(`${projectPath(projectId)}/files`, { media_id: mediaId })
      return { file: response.data.data, created: response.status === 201 }
    },
    onSettled: async () => invalidate(projectId),
  })
}

/** Detach: removes the link only — the file stays in the media library. */
export function useDetachProjectFile(projectId: number) {
  const invalidate = useInvalidateProject()
  return useMutation({
    mutationFn: async (fileId: number) => {
      await api.delete(`/api/v1/project-files/${fileId}`)
      return fileId
    },
    onSettled: async () => invalidate(projectId),
  })
}
