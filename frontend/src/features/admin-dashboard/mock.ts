// TODO(api): replace with GET /api/v1/admin/dashboard/stats and
//            GET /api/v1/admin/dashboard/charts?year= (PRD §11) — then delete this file.
//            Only features/admin-dashboard/api.ts imports it.

import type { AdminDashboardCharts, AdminDashboardSummary } from '@/features/admin-dashboard/types'

/* The sample values shown in design/admin-dashboard (lib/dashboard-data.ts + the page).
   Company ids are chosen so each avatar lands on the design's color (tone = id % 5). */

const monthsAgo = (months: number): string => {
  const date = new Date()
  date.setMonth(date.getMonth() - months)
  return date.toISOString()
}

export const mockSummary: AdminDashboardSummary = {
  currency: 'USD',
  stats: {
    totalRevenue: 2961.2,
    totalCompanies: 7,
    companiesGrowth: 0.55,
    activePlans: 3,
    monthlyGrowth: 0.55,
    pendingRequests: 6,
  },
  recentCompanies: [
    { id: 6, name: 'Healthcare Systems', email: 'admin@healthcare.com', status: 'active', joinedAt: monthsAgo(4) },
    { id: 5, name: 'Financial Services', email: 'admin@financial.com', status: 'active', joinedAt: monthsAgo(4) },
    { id: 7, name: 'Manufacturing Corp', email: 'admin@manufacturing.com', status: 'active', joinedAt: monthsAgo(4) },
    { id: 8, name: 'Creative Agency', email: 'admin@creativeagency.com', status: 'active', joinedAt: monthsAgo(4) },
    { id: 9, name: 'Tech Solutions Inc', email: 'admin@techsolutions.com', status: 'active', joinedAt: monthsAgo(4) },
  ],
  topPlans: [
    { id: 3, name: 'Pro', revenue: 199.96, subscribers: 4 },
    { id: 2, name: 'Starter', revenue: 39.98, subscribers: 2 },
    { id: 1, name: 'Free', revenue: 0, subscribers: 1 },
  ],
  chartYears: [2026, 2025, 2024],
}

const EMPTY_YEAR = Array.from({ length: 12 }, () => 0)

/** 2026 holds the design's series (98 companies, $93,900.00); earlier years are empty so
 *  the charts' empty states can be seen by switching the year. */
export function mockCharts(year: number): AdminDashboardCharts {
  return year === 2026
    ? {
        year,
        currency: 'USD',
        companiesByMonth: [3, 5, 4, 7, 6, 9, 8, 11, 7, 13, 10, 15],
        revenueByMonth: [4100, 5700, 3900, 7100, 6400, 8700, 7500, 8800, 8000, 10500, 9800, 13400],
      }
    : { year, currency: 'USD', companiesByMonth: EMPTY_YEAR, revenueByMonth: EMPTY_YEAR }
}

/* Dev-only switch to see every state without a backend: add `?mockState=` to the URL.
   loading → never resolves (skeletons) · error → rejects · empty → no companies or plans. */
export type MockState = 'default' | 'loading' | 'error' | 'empty'

export function mockStateFromUrl(): MockState {
  if (typeof window === 'undefined') return 'default'
  const value = new URLSearchParams(window.location.search).get('mockState')
  return value === 'loading' || value === 'error' || value === 'empty' ? value : 'default'
}

export function emptySummary(): AdminDashboardSummary {
  return {
    ...mockSummary,
    stats: { totalRevenue: 0, totalCompanies: 0, companiesGrowth: 0, activePlans: 0, monthlyGrowth: 0, pendingRequests: 0 },
    recentCompanies: [],
    topPlans: [],
  }
}
