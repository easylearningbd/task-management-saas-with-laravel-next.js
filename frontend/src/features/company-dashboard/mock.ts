// TODO(api): replace with GET /api/v1/dashboard and GET /api/v1/dashboard/charts?year=
//            (PRD §6.1), then delete this file. Only features/company-dashboard/api.ts imports it.
//            Those endpoints need the tenant modules first: Projects (+ milestones), Tasks and
//            Task Stages, Clients, Invoices (+ payments), Expenses, Contracts and Timesheets.
//
// MOCK DATA — every value below is a sample. Values from design/user-dashboard
// (lib/company-data.ts and the page) unless marked "not in the design".

import type { CompanyDashboardCharts, CompanyDashboardOverview } from '@/features/company-dashboard/types'

const monthsAgo = (months: number): string => {
  const date = new Date()
  date.setMonth(date.getMonth() - months)
  return date.toISOString()
}

export const mockOverview: CompanyDashboardOverview = {
  currency: 'USD',
  stats: {
    totalProjects: 12,
    activeProjects: 12,
    projectsGrowth: 0.155,
    activeTasks: 46,
    completedTasks: 27,
    totalClients: 12,
    activeClients: 9,
    totalRevenue: 195515,
    paidRevenue: 6900,
  },
  performance: {
    tasksDone: 27,
    tasksTotal: 52,
    invoicesPaid: 5,
    invoicesTotal: 16,
    // 6,900 − 2,100 = Net $4,800.00 → 69.6% (the design's figures).
    paidRevenue: 6900,
    expenses: 2100,
  },
  projects: [
    { id: 1, name: 'Enterprise Digital Transformation', status: 'completed', progress: 33, budget: 850000, spent: 6221 },
    // The other two only appear as select options in the design; their figures are not in the design.
    { id: 2, name: 'Supply Chain Management System', status: 'active', progress: 58, budget: 420000, spent: 125400 },
    { id: 3, name: 'Workflow Automation Platform', status: 'active', progress: 72, budget: 380000, spent: 97250 },
  ],
  taskDeadlines: [
    { id: 101, title: 'API Integration', project: 'Enterprise Digital Transformation', dueDate: '2026-09-08', priority: 'medium' },
    { id: 102, title: 'Backup Implementation', project: 'Supply Chain Management System', dueDate: '2026-09-09', priority: 'urgent' },
    { id: 103, title: 'API Integration', project: 'Supply Chain Management System', dueDate: '2026-09-11', priority: 'high' },
  ],
  // Empty in the design ("No upcoming invoice deadlines").
  invoiceDeadlines: [],
  recentContracts: [
    { id: 201, title: 'Development Contract - Workflow Automation Platform', client: { id: 1, name: 'Apple Inc' }, amount: 380000, status: 'active' },
    { id: 202, title: 'Maintenance Agreement - Enterprise Digital Transformation', client: { id: 2, name: 'Emily Davis' }, amount: 850000, status: 'completed' },
    { id: 203, title: 'Service Agreement - AI-Powered Analytics Platform', client: { id: 2, name: 'Emily Davis' }, amount: 650000, status: 'completed' },
    { id: 204, title: 'Consulting Contract - Mobile-First Application Suite', client: { id: 3, name: 'Google Cloud Platform' }, amount: 420000, status: 'completed' },
    { id: 205, title: 'Development Contract - Inventory Management', client: { id: 4, name: 'John Smith' }, amount: 28000, status: 'signed' },
  ],
  recentTasks: [
    { id: 301, title: 'Code Review', project: 'Workflow Automation Platform', stage: { name: 'Cancelled', isDone: false }, updatedAt: monthsAgo(4) },
    { id: 302, title: 'API Integration', project: 'Data Lake and Analytics Infrastructure', stage: { name: 'Done', isDone: true }, updatedAt: monthsAgo(4) },
    { id: 303, title: 'UI/UX Implementation', project: 'Data Lake and Analytics Infrastructure', stage: { name: 'Cancelled', isDone: false }, updatedAt: monthsAgo(4) },
    { id: 304, title: 'Documentation', project: 'Data Lake and Analytics Infrastructure', stage: { name: 'Done', isDone: true }, updatedAt: monthsAgo(4) },
    { id: 305, title: 'API Integration', project: 'Workflow Automation Platform', stage: { name: 'Cancelled', isDone: false }, updatedAt: monthsAgo(4) },
  ],
}

const EMPTY_YEAR = Array.from({ length: 12 }, () => 0)

/** The design's 2026 series (revenue totals $22,500.00, hours 750); other years — and the
 *  `empty` preview — have no data. */
export function mockCharts(year: number, empty = false): CompanyDashboardCharts {
  const base = { year, currency: 'USD', years: [2026, 2025, 2024] }
  return year === 2026 && !empty
    ? {
        ...base,
        revenueByMonth: [450, 900, 1150, 800, 1450, 1950, 1850, 2400, 2250, 2700, 3050, 3550],
        hoursByMonth: [42, 38, 55, 61, 48, 72, 65, 80, 58, 74, 69, 88],
      }
    : { ...base, revenueByMonth: EMPTY_YEAR, hoursByMonth: EMPTY_YEAR }
}

/* Dev-only switch to see every state without a backend: add `?mockState=` to the URL.
   loading → never resolves (skeletons) · error → rejects · empty → a brand-new company. */
export type MockState = 'default' | 'loading' | 'error' | 'empty'

export function mockStateFromUrl(): MockState {
  if (typeof window === 'undefined') return 'default'
  const value = new URLSearchParams(window.location.search).get('mockState')
  return value === 'loading' || value === 'error' || value === 'empty' ? value : 'default'
}

/** A company that has just signed up: nothing yet anywhere. */
export function emptyOverview(): CompanyDashboardOverview {
  return {
    currency: 'USD',
    stats: {
      totalProjects: 0,
      activeProjects: 0,
      projectsGrowth: 0,
      activeTasks: 0,
      completedTasks: 0,
      totalClients: 0,
      activeClients: 0,
      totalRevenue: 0,
      paidRevenue: 0,
    },
    performance: { tasksDone: 0, tasksTotal: 0, invoicesPaid: 0, invoicesTotal: 0, paidRevenue: 0, expenses: 0 },
    projects: [],
    taskDeadlines: [],
    invoiceDeadlines: [],
    recentContracts: [],
    recentTasks: [],
  }
}
