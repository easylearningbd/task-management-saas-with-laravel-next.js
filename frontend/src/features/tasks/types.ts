/* Mirrors the backend task resources and requests (App\Http\Resources\TaskResource,
   TaskChecklistItemResource, TaskFileResource, the board / stats payloads of TaskController).
   Everything belongs to the signed-in company — the API never sends or accepts `company_id`.
   Plain dates are "YYYY-MM-DD"; timestamps ISO 8601 (UTC). Labels and every computed figure
   (`is_overdue`, the checklist summary, the stats) come from the API. */

import type { Media } from '@/features/media/types'

/* ── Enums ── */

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'
/** Low → Urgent (the select order). */
export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const satisfies ReadonlyArray<TaskPriority>

/* ── Tasks ── */

/** The stage as a task carries it. */
export interface TaskStageRef {
  id: number
  name: string
  /** "#3B82F6" */
  color: string
  is_done_stage: boolean
}

export interface TaskCreator {
  id: number
  name: string
  email: string
  /** A public URL, or null (initials instead). */
  avatar: string | null
}

export interface Task {
  id: number
  title: string
  description: string | null
  project_id: number
  /** null only if the project row is gone (it's kept with trashed). */
  project: { id: number; name: string } | null
  milestone_id: number | null
  milestone: { id: number; title: string } | null
  task_stage_id: number
  stage: TaskStageRef
  start_date: string
  due_date: string
  priority: TaskPriority
  priority_label: string
  /** 0–100; 100 while in the done stage. */
  progress: number
  /** 1-based, contiguous within its stage column. */
  position: number
  /** Set while the task is in the done stage. */
  completed_at: string | null
  /** Due before today and not in the done stage (business rule 5). */
  is_overdue: boolean
  checklist_summary: { total: number; completed: number }
  /** The details payload only. */
  files_count?: number
  created_by: TaskCreator | null
  created_at: string | null
  updated_at: string | null
}

/** GET /api/v1/tasks/{id} — the task with its tab counts. */
export interface TaskDetail extends Task {
  files_count: number
}

/** POST /api/v1/tasks and PUT /api/v1/tasks/{id} — StoreTaskRequest / UpdateTaskRequest. */
export interface TaskPayload {
  title: string
  /** null = none */
  description: string | null
  project_id: number
  /** null = none; must be a milestone of `project_id` */
  milestone_id: number | null
  /** One of the company's active stages (edit: the current one may stay). */
  task_stage_id: number
  start_date: string
  /** Not before start_date. */
  due_date: string
  priority: TaskPriority
  /** null → 0 (100 in the done stage) */
  progress: number | null
}

/** PATCH /api/v1/tasks/{id}/move — the drag. */
export interface TaskMovePayload {
  task_stage_id: number
  /** 1-based position in the destination column. */
  position: number
}

/* ── Board, list, stats ── */

export interface TaskBoardColumn {
  stage: TaskStageRef & { order: number }
  count: number
  tasks: Task[]
}

/** GET /api/v1/tasks?view=board — every active stage in order, with its matching tasks. */
export interface TaskBoard {
  columns: TaskBoardColumn[]
}

/** GET /api/v1/tasks/stats — the four stat cards and the five priority tab counts. */
export interface TaskStats {
  total: number
  /** High + Urgent */
  high: number
  /** Low + Medium */
  low: number
  overdue: number
  priorities: Record<TaskPriority, number>
}

export type TaskSortKey = 'title' | 'priority' | 'start_date' | 'due_date' | 'progress' | 'created_at'
export const TASK_SORT_KEYS = [
  'title',
  'priority',
  'start_date',
  'due_date',
  'progress',
  'created_at',
] as const satisfies ReadonlyArray<TaskSortKey>

export type TaskFilterName = 'project_id' | 'milestone_id' | 'task_stage_id' | 'priority'

/** The filters both views take (IndexTaskRequest). */
export interface TaskFilters {
  /** Title or description. */
  search?: string
  project_id?: number
  milestone_id?: number
  task_stage_id?: number
  priority?: TaskPriority
}

/** GET /api/v1/tasks?view=board — never paginated. */
export type TaskBoardParams = TaskFilters

/** GET /api/v1/tasks?view=list. Default order: soonest due first. */
export interface TaskListParams extends TaskFilters {
  sort?: TaskSortKey
  direction?: 'asc' | 'desc'
  page: number
  /** 1–100 */
  per_page: number
}

/* ── Checklist ── */

export interface TaskChecklistItem {
  id: number
  task_id: number
  title: string
  is_completed: boolean
  /** 1-based, contiguous within the task. */
  position: number
  created_at: string | null
  updated_at: string | null
}

/** POST …/checklist-items (title required) and PUT /api/v1/task-checklist-items/{id} (either). */
export interface TaskChecklistItemPayload {
  title?: string
  is_completed?: boolean
}

/* ── Files ── */

export interface TaskFile {
  id: number
  task_id: number
  media: Media
  attached_at: string | null
}

/** A task tab's list: `{ data: [...] }` (not paginated — a task's own records). */
export interface ResourceList<T> {
  data: T[]
}
