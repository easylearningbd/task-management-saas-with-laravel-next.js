import { z } from 'zod'
import type { useTranslations } from 'next-intl'
import { COUPON_TYPES, type CodeMode, type Coupon, type CouponPayload, type CouponType } from '@/features/coupons/types'

/* Mirrors backend StoreCouponRequest / UpdateCouponRequest (and CouponService) exactly:
   name            required | max:255
   code_mode       required | manual or auto
   code            trimmed + uppercased; manual: required; auto: may be empty (server generates);
                   letters, digits, "-" and "_", at most 50; unique (server — its 422 lands here)
   type            required | percentage or flat
   value           required | numeric | 2 decimals | > 0 | ≤ 100 for percentage | ≤ DECIMAL(15,2)
   min/max_spend   optional | numeric | 2 decimals | ≥ 0 | max_spend ≥ min_spend when both given
   usage_limit,
   per_user_limit  empty = unlimited, else a whole number 1 … 4294967295
   expiry_date     optional | YYYY-MM-DD | create: today or later; edit: the stored date may stay
                   even if past, any other date must be today or later
   "Today" is the server's date — UTC — so both sides agree (see todayUtc()).
   Form fields stay strings (what inputs give); amounts are compared as integer cents. */

export const NAME_MAX = 255
export const CODE_MAX = 50
export const MAX_MONEY = '9999999999999.99'
export const LIMIT_MAX = 4294967295
export const PERCENT_MAX = '100'

const AMOUNT = /^\d+(\.\d{1,2})?$/
const NEGATIVE_AMOUNT = /^-\d+(\.\d{1,2})?$/
const CODE = /^[A-Z0-9_-]+$/
const WHOLE = /^\d+$/
const DATE = /^\d{4}-\d{2}-\d{2}$/

const HUNDRED = BigInt(100)
/** An AMOUNT as integer cents ("19.9" → 1990n). BigInt() calls: tsconfig targets ES2017. */
export function cents(amount: string): bigint {
  const [whole, fraction = ''] = amount.split('.')
  return BigInt(whole) * HUNDRED + BigInt(fraction.padEnd(2, '0'))
}

/** Today's date as the server sees it (UTC), YYYY-MM-DD. */
export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10)
}

/** Trim + uppercase, exactly as the server stores codes. */
export function normalizeCode(code: string): string {
  return code.trim().toUpperCase()
}

function isRealDate(value: string): boolean {
  if (!DATE.test(value)) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

type ValidationT = ReturnType<typeof useTranslations<'coupons.validation'>>

export type CouponSchemaOptions = {
  /** YYYY-MM-DD; pass todayUtc(). */
  today: string
  /** Edit: the stored expiry date, which may be kept even if it has passed. */
  originalExpiry?: string | null
}

export function createCouponSchema(t: ValidationT, { today, originalExpiry = null }: CouponSchemaOptions) {
  return z
    .object({
      name: z
        .string()
        .trim()
        .min(1, { error: t('nameRequired') })
        .max(NAME_MAX, { error: t('nameMax', { max: NAME_MAX }) }),
      code_mode: z.enum(['manual', 'auto']),
      code: z.string(),
      // '' until a type is chosen ("Select Discount Type"); checked below so every miss reads the same.
      type: z.string(),
      value: z.string(),
      min_spend: z.string(),
      max_spend: z.string(),
      usage_limit: z.string(),
      per_user_limit: z.string(),
      expiry_date: z.string(),
    })
    .superRefine((values, ctx) => {
      const issue = (path: keyof typeof values, message: string) => ctx.addIssue({ code: 'custom', path: [path], message })

      // Code
      const code = normalizeCode(values.code)
      if (code === '') {
        if (values.code_mode === 'manual') issue('code', t('codeRequired'))
      } else if (code.length > CODE_MAX || !CODE.test(code)) {
        issue('code', t('codeInvalid', { max: CODE_MAX }))
      }

      // Type
      if (!(COUPON_TYPES as ReadonlyArray<string>).includes(values.type)) issue('type', t('typeRequired'))

      // Value — the ≤ 100 rule follows the chosen type.
      const value = values.value.trim()
      if (value === '') issue('value', t('valueRequired'))
      else if (NEGATIVE_AMOUNT.test(value)) issue('value', t('valuePositive'))
      else if (!AMOUNT.test(value)) issue('value', t('amountInvalid'))
      else if (cents(value) <= BigInt(0)) issue('value', t('valuePositive'))
      else if (values.type === 'percentage' && cents(value) > cents(PERCENT_MAX)) issue('value', t('percentMax'))
      else if (cents(value) > cents(MAX_MONEY)) issue('value', t('amountTooLarge'))

      // Spend range
      const spend = (key: 'min_spend' | 'max_spend'): string | null => {
        const raw = values[key].trim()
        if (raw === '') return null
        if (!AMOUNT.test(raw)) {
          issue(key, t('amountInvalid'))
          return null
        }
        if (cents(raw) > cents(MAX_MONEY)) {
          issue(key, t('amountTooLarge'))
          return null
        }
        return raw
      }
      const min = spend('min_spend')
      const max = spend('max_spend')
      if (min !== null && max !== null && cents(max) < cents(min)) issue('max_spend', t('spendRange'))

      // Limits
      for (const key of ['usage_limit', 'per_user_limit'] as const) {
        const raw = values[key].trim()
        if (raw !== '' && (!WHOLE.test(raw) || Number(raw) < 1 || Number(raw) > LIMIT_MAX)) issue(key, t('limitInvalid'))
      }

      // Expiry
      const expiry = values.expiry_date.trim()
      if (expiry !== '') {
        if (!isRealDate(expiry)) issue('expiry_date', t('dateInvalid'))
        else if (expiry !== originalExpiry && expiry < today) issue('expiry_date', t('datePast'))
      }
    })
}

export type CouponFormValues = z.infer<ReturnType<typeof createCouponSchema>>

/** The Add New Coupon form: everything empty, Manual Entry preselected. */
export const EMPTY_COUPON_FORM: CouponFormValues = {
  name: '',
  code_mode: 'manual',
  code: '',
  type: '',
  value: '',
  min_spend: '',
  max_spend: '',
  usage_limit: '',
  per_user_limit: '',
  expiry_date: '',
}

/** Edit prefill. The stored code is shown as a manual entry. */
export function couponToFormValues(coupon: Coupon): CouponFormValues {
  return {
    name: coupon.name,
    code_mode: 'manual',
    code: coupon.code,
    type: coupon.type,
    value: trimMoney(coupon.value),
    min_spend: coupon.min_spend === null ? '' : trimMoney(coupon.min_spend),
    max_spend: coupon.max_spend === null ? '' : trimMoney(coupon.max_spend),
    usage_limit: coupon.usage_limit === null ? '' : String(coupon.usage_limit),
    per_user_limit: coupon.per_user_limit === null ? '' : String(coupon.per_user_limit),
    expiry_date: coupon.expiry_date ?? '',
  }
}

/** Validated form values → API payload: uppercase code, empty → null, limits as numbers. */
export function formValuesToPayload(values: CouponFormValues): CouponPayload {
  const orNull = (value: string) => (value.trim() === '' ? null : value.trim())
  const code = normalizeCode(values.code)
  return {
    name: values.name.trim(),
    code_mode: values.code_mode satisfies CodeMode,
    code: code === '' ? null : code,
    type: values.type as CouponType, // the schema guarantees a type
    value: values.value.trim(),
    min_spend: orNull(values.min_spend),
    max_spend: orNull(values.max_spend),
    usage_limit: orNull(values.usage_limit) === null ? null : Number(values.usage_limit),
    per_user_limit: orNull(values.per_user_limit) === null ? null : Number(values.per_user_limit),
    expiry_date: orNull(values.expiry_date),
  }
}

/** "50.00" → "50", "12.50" → "12.5", "19.99" → "19.99" — how a person would type it. */
function trimMoney(amount: string): string {
  return amount.includes('.') ? amount.replace(/\.?0+$/, '') : amount
}
