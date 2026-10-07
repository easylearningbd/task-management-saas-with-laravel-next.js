import type { DashboardPerformance, ProjectProgress } from '@/features/company-dashboard/types'

/* Figures the page derives from the raw counts and sums (types.ts). Money math in integer
   cents (CLAUDE.md §8: never float arithmetic on money); percentages rounded to one decimal,
   as the design shows them (51.9%, 31.3%, 69.6%). */

const toCents = (amount: number) => Math.round(amount * 100)
const fromCents = (cents: number) => cents / 100

/** part / whole as a percentage with one decimal; 0 when there is no whole. */
export function percent(part: number, whole: number): number {
  if (whole <= 0) return 0
  return Math.round((part / whole) * 1000) / 10
}

export function taskCompletionRate(p: DashboardPerformance): number {
  return percent(p.tasksDone, p.tasksTotal)
}

export function invoicePaymentRate(p: DashboardPerformance): number {
  return percent(p.invoicesPaid, p.invoicesTotal)
}

/** Paid revenue minus expenses. */
export function netProfit(p: DashboardPerformance): number {
  return fromCents(toCents(p.paidRevenue) - toCents(p.expenses))
}

/** (paid revenue − expenses) / paid revenue; 0 with no paid revenue, never below 0 on the bar. */
export function profitMargin(p: DashboardPerformance): number {
  const paid = toCents(p.paidRevenue)
  if (paid <= 0) return 0
  return percent(paid - toCents(p.expenses), paid)
}

/** Budget minus spent. */
export function remainingBudget(project: ProjectProgress): number {
  return fromCents(toCents(project.budget) - toCents(project.spent))
}

/** Sum of a monthly money series (the Monthly Revenue badge). */
export function sumMoney(values: readonly number[]): number {
  return fromCents(values.reduce((total, value) => total + toCents(value), 0))
}
