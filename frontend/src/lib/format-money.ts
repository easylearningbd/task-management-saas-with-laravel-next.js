'use client'

import * as React from 'react'
import { useFormatter } from 'next-intl'

/* Money as brand-book.md's Data display rule has it: always two decimals, always the currency
   symbol ("$850,000.00"), set in `font-mono` (`text-money`) by the caller. Amounts arrive from
   the API as DECIMAL(15,2) strings and are only formatted here, never added up — the server
   does the arithmetic (bcmath).
   TODO(currency): the company has no currency setting yet, so every company amount is USD,
   like the plans and coupons modules. */

export const APP_CURRENCY = 'USD'

export function useMoney(currency: string = APP_CURRENCY) {
  const format = useFormatter()
  return React.useCallback(
    (amount: string | number) => format.number(Number(amount), { style: 'currency', currency }),
    [format, currency],
  )
}
