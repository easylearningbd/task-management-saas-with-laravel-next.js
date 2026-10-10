/* File sizes, 1024-based like the plan's storage allowance (App\Services\PlanLimitService). */

const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const

/** 0 → "0 B", 1536 → "1.5 KB", 5368709120 → "5 GB" (1024-based, like the plan's GB limit). */
export function formatBytes(bytes: number): string {
  let value = Math.max(0, bytes)
  let unit = 0
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024
    unit += 1
  }
  const rounded = unit === 0 ? value : Math.round(value * 10) / 10
  return `${rounded} ${BYTE_UNITS[unit]}`
}
