/* Checks shared by forms that mirror Laravel rules on decimal money and plain dates. The server
   is the authority; these only catch what it would refuse, before the round trip.
   (The admin coupons module has its own copy from before this file; left as it is.) */

/** DECIMAL(15,2): 13 digits before the point. */
export const MONEY_MAX = '9999999999999.99'

const HUNDRED = BigInt(100)

/** An unsigned decimal string as integer cents ("19.9" → 1990n, ".5" → 50n) — no floating point. */
export function cents(amount: string): bigint {
  const [whole, fraction = ''] = amount.split('.')
  return BigInt(whole) * HUNDRED + BigInt(fraction.padEnd(2, '0'))
}

export type MoneyProblem = 'required' | 'invalid' | 'decimals' | 'negative' | 'tooLarge'

/** PHP is_numeric (Laravel `numeric`): "5", "5.", ".5", "+5", "1e3". */
const NUMERIC = /^[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/
/** Laravel `decimal:0,2` — no exponent, at most 2 decimals. */
const TWO_DECIMALS = /^[+-]?\d*(?:\.\d{0,2})?$/

/** What's wrong with a money field, or null — in the order Laravel checks
 *  `required|numeric|decimal:0,2|min:0|max`, so both sides name the same problem (checked
 *  against the API: "5." and ".5" pass, "1e3" is a decimals problem, as on the server). */
export function moneyProblem(raw: string): MoneyProblem | null {
  const value = raw.trim()
  if (value === '') return 'required'
  if (!NUMERIC.test(value)) return 'invalid'
  if (!TWO_DECIMALS.test(value)) return 'decimals'
  const unsigned = value.replace(/^[+-]/, '')
  if (value.startsWith('-') && cents(unsigned) > BigInt(0)) return 'negative'
  if (cents(unsigned) > cents(MONEY_MAX)) return 'tooLarge'
  return null
}

const DATE = /^\d{4}-\d{2}-\d{2}$/

/** Laravel `date_format:Y-m-d`: the shape and a real calendar day. */
export function isRealDate(value: string): boolean {
  if (!DATE.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/** Trimmed; empty → null (the API's "none"). */
export function orNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed === '' ? null : trimmed
}
