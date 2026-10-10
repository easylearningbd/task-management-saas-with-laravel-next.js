/* Mirrors the backend project resources and requests (App\Http\Resources\ProjectResource,
   ProjectDetailResource, MilestoneResource, ProjectItemResource, ProjectNoteResource,
   ExpenseResource, ProjectFileResource). Everything belongs to the signed-in company — the API
   never sends or accepts `company_id`. Money is a DECIMAL(15,2) string ("850000.00"); plain
   dates are "YYYY-MM-DD"; timestamps ISO 8601 (UTC). Labels (`*_label`) and every computed
   figure come from the API — the UI does no arithmetic on them. */

import type { Media } from '@/features/media/types'

/* ── Enums ── */

export type ProjectStatus = 'active' | 'completed' | 'on_hold' | 'inactive'
export const PROJECT_STATUSES = ['active', 'completed', 'on_hold', 'inactive'] as const satisfies ReadonlyArray<ProjectStatus>

export type ProjectPriority = 'low' | 'medium' | 'high' | 'urgent'
export const PROJECT_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const satisfies ReadonlyArray<ProjectPriority>

export type MilestoneStatus = 'pending' | 'in_progress' | 'completed'
export const MILESTONE_STATUSES = ['pending', 'in_progress', 'completed'] as const satisfies ReadonlyArray<MilestoneStatus>

export type ProjectItemUnit = 'hours' | 'package' | 'piece' | 'day' | 'month' | 'fixed'
export const PROJECT_ITEM_UNITS = ['hours', 'package', 'piece', 'day', 'month', 'fixed'] as const satisfies ReadonlyArray<ProjectItemUnit>

export type ProjectItemStatus = 'active' | 'inactive'

export type ProjectHealth = 'low' | 'medium' | 'high'

/* ── Projects ── */

export interface ProjectClient {
  id: number
  name: string
  email: string
  /** "ED" */
  initials: string
}

export interface Project {
  id: number
  name: string
  description: string | null
  /** null only if the client row is gone (it's kept with trashed). */
  client: ProjectClient | null
  client_id: number
  start_date: string
  end_date: string
  budget: string
  priority: ProjectPriority
  priority_label: string
  status: ProjectStatus
  status_label: string
  /** The lock action applies (Active ⇄ Inactive only). */
  can_toggle: boolean
  /** 0–100. TODO(tasks): tasks in a done stage ÷ all tasks — 0 until the tasks module ships. */
  progress: number
  created_at: string | null
  updated_at: string | null
}

/** GET /api/v1/projects/{id} — computed by App\Support\Projects\ProjectFigures. */
export interface ProjectFigures {
  /** TODO(tasks): 0 / 0 until the tasks module ships. */
  tasks: { total: number; completed: number }
  progress: number
  health: { value: ProjectHealth; label: string }
  /** Overdue milestones (TODO(tasks): + overdue tasks). */
  overdue: number
  milestones: { total: number; completed: number; percent: number }
  budget: { total: string; spent: string; remaining: string; spent_percent: number; remaining_percent: number }
  /** TODO(contracts): 0 / 0 until the contracts module ships. */
  contracts: { active: number; total: number }
}

export interface ProjectCounts {
  milestones: number
  items: number
  notes: number
  expenses: number
  files: number
  /** TODO(contracts): always 0 for now. */
  contracts: number
}

export interface ProjectDetail extends Project {
  figures: ProjectFigures
  counts: ProjectCounts
}

/** GET /api/v1/projects/stats — the stat cards and the status tab counts. */
export interface ProjectStats {
  total: number
  active: number
  completed: number
  on_hold: number
  inactive: number
}

/** POST /api/v1/projects and PUT /api/v1/projects/{id} — StoreProjectRequest / UpdateProjectRequest. */
export interface ProjectPayload {
  name: string
  /** null = none */
  description: string | null
  client_id: number
  start_date: string
  end_date: string
  /** "850000" or "850000.50" */
  budget: string
  priority: ProjectPriority
  status: ProjectStatus
}

export type ProjectSortKey = 'name' | 'priority' | 'status' | 'budget' | 'start_date' | 'end_date' | 'created_at'
export const PROJECT_SORT_KEYS = [
  'name',
  'priority',
  'status',
  'budget',
  'start_date',
  'end_date',
  'created_at',
] as const satisfies ReadonlyArray<ProjectSortKey>

export type ProjectFilterName = 'status' | 'priority' | 'client_id' | 'created_from' | 'created_to'

/** GET /api/v1/projects (IndexProjectRequest). Default order: oldest first. */
export interface ProjectListParams {
  /** Name, description or client name. */
  search?: string
  status?: ProjectStatus
  priority?: ProjectPriority
  client_id?: number
  /** YYYY-MM-DD, inclusive */
  created_from?: string
  /** YYYY-MM-DD, inclusive; not before created_from */
  created_to?: string
  sort?: ProjectSortKey
  direction?: 'asc' | 'desc'
  page: number
  /** 1–100 */
  per_page: number
}

/* ── Milestones ── */

export interface Milestone {
  id: number
  project_id: number
  title: string
  description: string | null
  start_date: string | null
  due_date: string | null
  /** 0–100 */
  progress: number
  status: MilestoneStatus
  status_label: string
  /** Due before today and not completed. */
  is_overdue: boolean
  created_at: string | null
  updated_at: string | null
}

/** StoreMilestoneRequest / UpdateMilestoneRequest (no Start Date field in the modal — decision 7). */
export interface MilestonePayload {
  title: string
  description: string | null
  due_date: string
  /** null → 0 */
  progress: number | null
  status: MilestoneStatus
}

/* ── Items ── */

export interface ProjectItem {
  id: number
  project_id: number
  name: string
  description: string | null
  default_price: string
  unit: ProjectItemUnit
  /** "hours" */
  unit_label: string
  status: ProjectItemStatus
  status_label: string
  created_at: string | null
  updated_at: string | null
}

export interface ProjectItemPayload {
  name: string
  description: string | null
  default_price: string
  unit: ProjectItemUnit
}

/* ── Notes ── */

export interface ProjectNote {
  id: number
  project_id: number
  title: string
  content: string
  /** Who wrote it (set by the server from the session); null if that user is gone. */
  author: { id: number; name: string } | null
  created_at: string | null
  updated_at: string | null
}

export interface ProjectNotePayload {
  title: string
  content: string
}

/* ── Expenses ── */

export interface Expense {
  id: number
  project_id: number
  title: string
  description: string | null
  amount: string
  expense_date: string
  expense_category_id: number
  /** The badge: the category's own colour (#RRGGBB). */
  category: { id: number; name: string; color: string } | null
  created_at: string | null
  updated_at: string | null
}

export interface ExpensePayload {
  title: string
  description: string | null
  amount: string
  expense_date: string
  expense_category_id: number
}

/** GET /api/v1/projects/{id}/expenses/stats */
export interface ExpenseStats {
  count: number
  /** "6221.00" */
  total: string
}

/* ── Files ── */

export interface ProjectFile {
  id: number
  project_id: number
  media: Media
  attached_at: string | null
}

/** A project tab's list: `{ data: [...] }` (not paginated — a project's own records). */
export interface ResourceList<T> {
  data: T[]
}
