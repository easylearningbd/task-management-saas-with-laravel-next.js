'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { emptySummary, mockCharts, mockStateFromUrl, mockSummary } from '@/features/admin-dashboard/mock'
import type { AdminDashboardCharts, AdminDashboardSummary } from '@/features/admin-dashboard/types'

/* Super Admin dashboard data. Currently resolves the mock (see mock.ts); when the endpoints
   land, replace the two query functions with:
     api.get<Resource<AdminDashboardSummary>>('/api/v1/admin/dashboard/stats')
     api.get<Resource<AdminDashboardCharts>>('/api/v1/admin/dashboard/charts', { params: { year } })
   Nothing else changes. */

export const adminDashboardKeys = {
  all: ['admin-dashboard'] as const,
  summary: ['admin-dashboard', 'summary'] as const,
  charts: (year: number) => ['admin-dashboard', 'charts', year] as const,
}

/** Simulated network latency so loading and refresh states are visible with the mock. */
const MOCK_LATENCY_MS = 250

function resolveMock<T>(value: () => T): Promise<T> {
  const state = mockStateFromUrl()
  if (state === 'loading') return new Promise<T>(() => {})
  if (state === 'error') return Promise.reject(new Error('Mock: dashboard request failed'))
  return new Promise<T>((resolve) => setTimeout(() => resolve(value()), MOCK_LATENCY_MS))
}

export function useAdminDashboard() {
  return useQuery({
    queryKey: adminDashboardKeys.summary,
    queryFn: () => resolveMock<AdminDashboardSummary>(() => (mockStateFromUrl() === 'empty' ? emptySummary() : mockSummary)),
  })
}

export function useAdminDashboardCharts(year: number) {
  return useQuery({
    queryKey: adminDashboardKeys.charts(year),
    queryFn: () => resolveMock<AdminDashboardCharts>(() => mockCharts(year)),
    placeholderData: keepPreviousData, // keep the old year on screen while the new one loads
  })
}
