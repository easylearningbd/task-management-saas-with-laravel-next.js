/* GET /api/v1/plan-usage — App\Services\PlanLimitService::usage(): the company's plan (or the
   default plan it falls back to) and its usage against the allowance. The UI hint is never
   the guard: the server refuses over-limit creates and uploads with a 422 of its own. */

export interface PlanUsage {
  /** null only if no plan exists at all. */
  plan: { id: number; name: string } | null
  /** limit -1 = unlimited */
  projects: { used: number; limit: number }
  /** Bytes, 1024-based GB. */
  storage: { used_bytes: number; limit_bytes: number }
  ai_integration: boolean
}

export const UNLIMITED = -1
