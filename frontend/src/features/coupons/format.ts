'use client'

import * as React from 'react'
import { useFormatter } from 'next-intl'

/** Coupons are in USD until the Currency module (PRD §8.7) makes this a setting — the same
 *  currency the API's `discount_display` uses. */
export const COUPON_CURRENCY = 'USD'

/** Display helpers for coupon values that the API sends raw (spends). */
export function useCouponFormat() {
  const format = useFormatter()

  return React.useMemo(
    () => ({
      /** "1000.00" → "$1,000.00"; null → "-" (Table.md: empty cells read "-"). */
      money: (amount: string | null) =>
        amount === null ? '-' : format.number(Number(amount), { style: 'currency', currency: COUPON_CURRENCY }),
      /** ISO timestamp → "2026-10-06 20:13" in the viewer's time (brand-book.md: dates are YYYY-MM-DD). */
      dateTime: (iso: string) => {
        const d = new Date(iso)
        const pad = (n: number) => String(n).padStart(2, '0')
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`
      },
    }),
    [format],
  )
}
