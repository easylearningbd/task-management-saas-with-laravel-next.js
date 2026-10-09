/* Mirrors backend App\Http\Resources\TaskStageResource, the stage requests and the stats
   endpoint. A stage belongs to the signed-in company — the API never sends or accepts
   `company_id`. Dates are ISO 8601 (UTC). `color` always arrives as uppercase `#RRGGBB`. */

export type TaskStageStatus = 'active' | 'inactive'

export const TASK_STAGE_STATUSES = ['active', 'inactive'] as const satisfies ReadonlyArray<TaskStageStatus>

export interface TaskStage {
  id: number
  name: string
  description: string | null
  /** "#6B7280" */
  color: string
  /** 1..n, contiguous within the company. */
  order: number
  /** Exactly one stage per company is the done stage. */
  is_done_stage: boolean
  status: TaskStageStatus
  /** "Active" | "Inactive" */
  status_label: string
  /** Always 0 until the Tasks module exists (backend TODO(tasks)). */
  tasks_count: number
  created_at: string | null
  updated_at: string | null
}

/** POST /api/v1/task-stages and PUT …/{id} — Store/UpdateTaskStageRequest. */
export interface TaskStagePayload {
  name: string
  /** null = no description */
  description: string | null
  /** "#RRGGBB" */
  color: string
  /** null = at the end (create) / keep its place (edit) */
  order: number | null
  status: TaskStageStatus
  is_done_stage: boolean
}

/** GET /api/v1/task-stages/stats */
export interface TaskStageStats {
  total: number
  active: number
  inactive: number
  done_stage: { id: number; name: string } | null
}

/* ── List query ── */

export type TaskStageFilterName = 'status' | 'created_from' | 'created_to'

/** GET /api/v1/task-stages (IndexTaskStageRequest) — the whole workflow, never paginated. */
export interface TaskStageListParams {
  /** Name or description. */
  search?: string
  status?: TaskStageStatus
  /** YYYY-MM-DD, inclusive */
  created_from?: string
  /** YYYY-MM-DD, inclusive; not before created_from */
  created_to?: string
}

/** The list response: a resource collection without pagination meta. */
export interface TaskStageList {
  data: TaskStage[]
}
