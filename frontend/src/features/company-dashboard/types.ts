/* Shapes the company dashboard renders (PRD §6.1, design/user-dashboard). They mirror the
   planned API resources — GET /api/v1/dashboard (overview) and
   GET /api/v1/dashboard/charts?year= — the same split as the Super Admin dashboard.
   Conventions (as in features/admin-dashboard): camelCase; money is a plain number in
   `currency`, formatted in the UI; dates are YYYY-MM-DD, timestamps ISO 8601.
   Figures the UI can derive (percentages, remaining budget, net profit) are not sent — the
   raw counts and sums are, so the numbers on screen can never disagree with each other.

   NOT here: the company's name, email, avatar and plan. Those are the signed-in account and
   come from GET /api/v1/me (features/auth), never from this payload. */

export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export type ProjectStatus = 'active' | 'completed' | 'on_hold' | 'inactive'

export type ContractStatus = 'draft' | 'pending' | 'signed' | 'active' | 'completed' | 'cancelled'

/** The four KPI cards and the hero chips. */
export interface DashboardStats {
  totalProjects: number
  /** Projects in `active` status — the hero's "{n} active projects" and its Projects chip. */
  activeProjects: number
  /** Change in project count this month vs last, as a fraction (0.155 = +15.5%). */
  projectsGrowth: number
  /** Tasks not in a done stage. */
  activeTasks: number
  /** Tasks in a done stage. */
  completedTasks: number
  totalClients: number
  activeClients: number
  /** Sum of all invoice totals. */
  totalRevenue: number
  /** Sum of payments received. */
  paidRevenue: number
}

/** Performance Overview — the three rates are computed in the UI from these. */
export interface DashboardPerformance {
  /** Task Completion Rate = tasksDone / tasksTotal ("27 of 52 tasks done"). */
  tasksDone: number
  tasksTotal: number
  /** Invoice Payment Rate = invoicesPaid / invoicesTotal ("5 of 16 invoices paid"). */
  invoicesPaid: number
  invoicesTotal: number
  /** Profit Margin = (paidRevenue − expenses) / paidRevenue; "Net: $X" is the difference. */
  paidRevenue: number
  expenses: number
}

/** One project in the Project Progress selector. */
export interface ProjectProgress {
  id: number
  name: string
  status: ProjectStatus
  /** 0–100, from the project's tasks. */
  progress: number
  budget: number
  /** Sum of the project's expenses; Remaining = budget − spent. */
  spent: number
}

export interface TaskDeadline {
  id: number
  title: string
  project: string
  /** YYYY-MM-DD */
  dueDate: string
  priority: Priority
}

export interface InvoiceDeadline {
  id: number
  /** INV-2026-0001 */
  number: string
  client: string
  /** YYYY-MM-DD */
  dueDate: string
  /** Balance still owed. */
  amountDue: number
}

export interface RecentContract {
  id: number
  title: string
  client: { id: number; name: string }
  amount: number
  status: ContractStatus
}

export interface RecentTask {
  id: number
  title: string
  project: string
  /** The task's current stage (company-defined, PRD §13): its name, and whether it is a done stage. */
  stage: { name: string; isDone: boolean }
  /** ISO 8601 — last activity on the task. */
  updatedAt: string
}

/** GET /api/v1/dashboard */
export interface CompanyDashboardOverview {
  currency: string
  stats: DashboardStats
  performance: DashboardPerformance
  /** Most recent first; the first one is selected by default. */
  projects: ProjectProgress[]
  /** Next due first, not in a done stage, at most 5. */
  taskDeadlines: TaskDeadline[]
  /** Unpaid invoices, next due first, at most 5. */
  invoiceDeadlines: InvoiceDeadline[]
  /** Newest first, at most 5. */
  recentContracts: RecentContract[]
  /** Most recent activity first, at most 5. */
  recentTasks: RecentTask[]
}

/** GET /api/v1/dashboard/charts?year= */
export interface CompanyDashboardCharts {
  year: number
  currency: string
  /** Years that have data, newest first — the year selectors' options. */
  years: number[]
  /** Paid invoice revenue per month, January first (12 values). */
  revenueByMonth: number[]
  /** Logged timesheet hours per month, January first (12 values). */
  hoursByMonth: number[]
}
