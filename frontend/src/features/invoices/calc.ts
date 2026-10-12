/* The invoice form's LIVE PREVIEW of the server's arithmetic (App\Services\InvoiceService::
   calculate) — exact integer maths on BigInt cents, never floats, with the same half-up rounding:
     line  = quantity × price, rounded to the cent
     tax   = (subtotal − discount) × rate / 100, rounded per tax
     total = subtotal − discount + Σ taxes
   The figures the invoice keeps always come back from the server on save; this only previews. */

import { cents } from '@/lib/form-values'

const ZERO = BigInt(0)
const TWO = BigInt(2)
const HUNDRED = BigInt(100)
const TEN_THOUSAND = BigInt(10000)

/** "12.5" → 1250n (hundredths, via the shared `cents`). Anything that isn't a non-negative 2-place decimal → ZERO. */
export function toHundredths(value: string | null | undefined): bigint {
  const trimmed = (value ?? '').trim()
  return /^\d+(\.\d{0,2})?$/.test(trimmed) ? cents(trimmed) : ZERO
}

/** 123456n (cents) → "1234.56" */
export function fromCents(cents: bigint): string {
  const negative = cents < ZERO
  const abs = negative ? -cents : cents
  const whole = abs / HUNDRED
  const frac = (abs % HUNDRED).toString().padStart(2, '0')
  return `${negative ? '-' : ''}${whole}.${frac}`
}

/** Half-up integer division of a non-negative numerator. */
function divRound(numerator: bigint, divisor: bigint): bigint {
  return (numerator + divisor / TWO) / divisor
}

export type InvoicePreview = {
  /** Each line's total ("565.00"), in order. */
  lines: string[]
  subtotal: string
  discount: string
  /** Each tax's amount, in the rates' order. */
  taxes: string[]
  taxAmount: string
  total: string
  /** The rates added up ("15.00") — the summary's "Tax (15%)". */
  taxRate: string
  /** The discount is more than the subtotal (the server refuses it). */
  discountTooHigh: boolean
}

export function previewInvoice(
  lines: ReadonlyArray<{ quantity: string; price: string }>,
  discount: string,
  rates: ReadonlyArray<string>,
): InvoicePreview {
  const lineCents = lines.map((line) => divRound(toHundredths(line.quantity) * toHundredths(line.price), HUNDRED))
  const subtotal = lineCents.reduce((sum, cents) => sum + cents, ZERO)
  const discountCents = toHundredths(discount)
  const discountTooHigh = discountCents > subtotal
  const taxable = discountTooHigh ? ZERO : subtotal - discountCents
  // rate is a percent in hundredths ("10.00" → 1000n): taxable × rate / 100 → cents × hundredths / 10000
  const taxCents = rates.map((rate) => divRound(taxable * toHundredths(rate), TEN_THOUSAND))
  const taxAmount = taxCents.reduce((sum, cents) => sum + cents, ZERO)

  return {
    lines: lineCents.map(fromCents),
    subtotal: fromCents(subtotal),
    discount: fromCents(discountCents),
    taxes: taxCents.map(fromCents),
    taxAmount: fromCents(taxAmount),
    total: fromCents(taxable + taxAmount),
    taxRate: fromCents(rates.reduce((sum, rate) => sum + toHundredths(rate), ZERO)),
    discountTooHigh,
  }
}

/** `amount` ≤ `limit`, both 2-place decimal strings — exact. */
export function isAtMost(amount: string, limit: string): boolean {
  return toHundredths(amount) <= toHundredths(limit)
}
