'use client'

import * as React from 'react'
import { useFormatter } from 'next-intl'

/* Locale-aware formatting for the dashboard — every figure goes through next-intl. */
export function useDashboardFormat(currency: string) {
  const format = useFormatter()

  return React.useMemo(
    () => ({
      /** $2,961.20 — always two decimals, always the symbol (brand-book.md, Data display). */
      money: (value: number) => format.number(value, { style: 'currency', currency }),
      /** +55% — growth keeps its sign (StatCard.md). */
      signedPercent: (fraction: number) => format.number(fraction, { style: 'percent', signDisplay: 'exceptZero' }),
      /** 55% */
      percent: (fraction: number) => format.number(fraction, { style: 'percent' }),
      count: (value: number) => format.number(value),
      /** Jan … Dec */
      monthShort: (year: number, month: number) =>
        format.dateTime(new Date(Date.UTC(year, month, 1)), { month: 'short', timeZone: 'UTC' }),
      /** August 2026 */
      monthYear: (year: number, month: number) =>
        format.dateTime(new Date(Date.UTC(year, month, 1)), { month: 'long', year: 'numeric', timeZone: 'UTC' }),
      /** 4 months ago */
      relative: (iso: string) => format.relativeTime(new Date(iso), new Date()),
    }),
    [format, currency],
  )
}
