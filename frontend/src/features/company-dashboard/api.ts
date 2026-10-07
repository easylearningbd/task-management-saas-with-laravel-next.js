'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { emptyOverview, mockCharts, mockOverview, mockStateFromUrl } from '@/features/company-dashboard/mock'
import type { CompanyDashboardCharts, CompanyDashboardOverview } from '@/features/company-dashboard/types'

/* Company dashboard data. Currently resolves the mock (see mock.ts); when the endpoints land,
   replace the two query functions with:
     api.get<Resource<CompanyDashboardOverview>>('/api/v1/dashboard')
     api.get<Resource<CompanyDashboardCharts>>('/api/v1/dashboard/charts', { params: { year } })
   Nothing else changes.
   The signed-in company's name, email, avatar (and plan, once /me carries it) are NOT here:
   read them from useMe() in features/auth. */

export const companyDashboardKeys = {
  all: ['company-dashboard'] as const,
  overview: ['company-dashboard', 'overview'] as const,
  charts: (year: number) => ['company-dashboard', 'charts', year] as const,
}

/** Simulated network latency so loading states are visible with the mock. */
const MOCK_LATENCY_MS = 250

function resolveMock<T>(value: () => T): Promise<T> {
  const state = mockStateFromUrl()
  if (state === 'loading') return new Promise<T>(() => {})
  if (state === 'error') return Promise.reject(new Error('Mock: dashboard request failed'))
  return new Promise<T>((resolve) => setTimeout(() => resolve(value()), MOCK_LATENCY_MS))
}

/** Everything on the page except the two charts. */
export function useCompanyDashboard() {
  return useQuery({
    queryKey: companyDashboardKeys.overview,
    queryFn: () => resolveMock<CompanyDashboardOverview>(() => (mockStateFromUrl() === 'empty' ? emptyOverview() : mockOverview)),
  })
}

/**
 * Monthly revenue and timesheet hours for one year. Each chart has its own year selector, so
 * each calls this with its own year; a year is fetched once and cached.
 */
export function useCompanyDashboardCharts(year: number) {
  return useQuery({
    queryKey: companyDashboardKeys.charts(year),
    queryFn: () => resolveMock<CompanyDashboardCharts>(() => mockCharts(year, mockStateFromUrl() === 'empty')),
    placeholderData: keepPreviousData, // keep the old year on screen while the new one loads
  })
}
