/**
 * Y-axis scale with four equal steps from 0, rounded up to a readable step.
 * Reproduces the design's axes: max 15 companies → 0/4/8/12/16;
 * max $13,400 → 0/3,500/7,000/10,500/14,000.
 *
 * Step granularity is a quarter of the raw step's power of ten (≥ 1 for whole-number series).
 */
export function niceScale(values: readonly number[], { integer = false } = {}) {
  const STEPS = 4
  const dataMax = Math.max(0, ...values)
  const raw = dataMax / STEPS

  let step: number
  if (raw === 0) {
    step = 1
  } else {
    const magnitude = 10 ** Math.floor(Math.log10(raw))
    const grain = integer ? Math.max(1, magnitude / 4) : magnitude / 4
    step = Math.ceil(raw / grain) * grain
  }

  const max = step * STEPS
  // Top tick first, matching the axis render order.
  const ticks = Array.from({ length: STEPS + 1 }, (_, i) => max - i * step)
  return { max, ticks }
}
