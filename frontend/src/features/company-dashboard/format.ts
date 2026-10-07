'use client'

import * as React from 'react'
import { useFormatter } from 'next-intl'

/* Locale-aware formatting for the company dashboard — every figure goes through next-intl. */
export function useCompanyDashboardFormat(currency: string) {
  const format = useFormatter()

  return React.useMemo(
    () => ({
      /** $195,515.00 — always two decimals, always the symbol (brand-book.md, Data display). */
      money: (value: number) => format.number(value, { style: 'currency', currency }),
      count: (value: number) => format.number(value),
      /** +15.5% — a fraction, sign kept (StatCard.md). */
      signedPercent: (fraction: number) =>
        format.number(fraction, { style: 'percent', signDisplay: 'exceptZero', maximumFractionDigits: 1 }),
      /** 51.9% — from a 0–100 figure. */
      percent: (value: number) => format.number(value / 100, { style: 'percent', maximumFractionDigits: 1 }),
      /** Jan … Dec */
      monthShort: (year: number, month: number) =>
        format.dateTime(new Date(Date.UTC(year, month, 1)), { month: 'short', timeZone: 'UTC' }),
      /** January 2026 */
      monthYear: (year: number, month: number) =>
        format.dateTime(new Date(Date.UTC(year, month, 1)), { month: 'long', year: 'numeric', timeZone: 'UTC' }),
    }),
    [format, currency],
  )
}
