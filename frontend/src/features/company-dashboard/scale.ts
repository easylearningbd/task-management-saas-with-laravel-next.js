import type { ChartScale } from '@/components/shared/charts/chart-parts'

/**
 * Y-axis for the company charts: four equal steps from 0, each step rounded up to a multiple
 * of half its power of ten. Reproduces both axes in design/user-dashboard:
 * revenue max $3,550 → step 900 → 0 / 900 / 1,800 / 2,700 / 3,600;
 * hours max 88 → step 25 → 0 / 25 / 50 / 75 / 100.
 */
export function chartScale(values: readonly number[]): ChartScale {
  const STEPS = 4
  const raw = Math.max(0, ...values) / STEPS

  let step = 1
  if (raw > 0) {
    const grain = Math.max(1, 10 ** Math.floor(Math.log10(raw)) / 2)
    step = Math.ceil(raw / grain) * grain
  }

  const max = step * STEPS
  // Top tick first, matching the axis render order.
  return { max, ticks: Array.from({ length: STEPS + 1 }, (_, i) => max - i * step) }
}
