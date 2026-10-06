import { z } from 'zod'
import type { useTranslations } from 'next-intl'
import type { Plan, PlanPayload } from '@/features/plans/types'

/* Mirrors backend StorePlanRequest exactly:
   name             required | max:255 | unique (server-side; its 422 lands under the field)
   description      nullable | max:1000
   monthly_price    required | numeric | decimal:0,2 | min:0 | max:9999999999999.99
   yearly_price     nullable | numeric | decimal:0,2 | min:0 | max:9999999999999.99
   max_projects     required | integer | min:-1            (-1 = unlimited)
   storage_limit_gb required | numeric | decimal:0,2 | min:0 | max:999999.99
   trial_days       trial on: required | integer | min:1 | max:3650 · off: nullable | min:0
   Numeric fields stay strings in the form (what <input type="number"> gives) and are
   compared as integer cents — never as floats. */

export const NAME_MAX = 255
export const DESCRIPTION_MAX = 1000
export const TRIAL_DAYS_MAX = 3650
export const MAX_PRICE = '9999999999999.99'
export const MAX_STORAGE_GB = '999999.99'
export const UNLIMITED_PROJECTS = -1

/** "0", "19", "19.9", "19.99" — no sign, at most 2 decimals. */
const AMOUNT = /^\d+(\.\d{1,2})?$/
const INTEGER = /^-?\d+$/

/** An AMOUNT as integer cents, for exact comparisons ("19.9" → 1990). BigInt() calls rather
 *  than `100n` literals: tsconfig targets ES2017. */
const HUNDRED = BigInt(100)
function cents(amount: string): bigint {
  const [whole, fraction = ''] = amount.split('.')
  return BigInt(whole) * HUNDRED + BigInt(fraction.padEnd(2, '0'))
}

type ValidationT = ReturnType<typeof useTranslations<'plans.validation'>>

export function createPlanSchema(t: ValidationT) {
  const amount = (requiredMessage: string, max: string, maxMessage: string, invalidMessage: string) =>
    z
      .string()
      .trim()
      .min(1, { error: requiredMessage })
      .regex(AMOUNT, { error: invalidMessage })
      .refine((value) => cents(value) <= cents(max), { error: maxMessage })

  return z
    .object({
      name: z
        .string()
        .trim()
        .min(1, { error: t('nameRequired') })
        .max(NAME_MAX, { error: t('nameMax', { max: NAME_MAX }) }),
      description: z.string().trim().max(DESCRIPTION_MAX, { error: t('descriptionMax', { max: DESCRIPTION_MAX }) }),
      monthly_price: amount(t('priceRequired'), MAX_PRICE, t('priceMax'), t('priceInvalid')),
      yearly_price: z
        .string()
        .trim()
        .refine((value) => value === '' || (AMOUNT.test(value) && cents(value) <= cents(MAX_PRICE)), {
          error: t('priceInvalid'),
        }),
      max_projects: z
        .string()
        .trim()
        .min(1, { error: t('maxProjectsRequired') })
        .refine((value) => INTEGER.test(value) && Number(value) >= UNLIMITED_PROJECTS, {
          error: t('maxProjectsInvalid'),
        }),
      storage_limit_gb: amount(
        t('storageRequired'),
        MAX_STORAGE_GB,
        t('storageMax', { max: MAX_STORAGE_GB }),
        t('storageInvalid'),
      ),
      trial_enabled: z.boolean(),
      trial_days: z.string().trim(),
      ai_integration: z.boolean(),
      is_active: z.boolean(),
      is_default: z.boolean(),
    })
    .superRefine((values, ctx) => {
      const days = values.trial_days
      const isWhole = /^\d+$/.test(days)
      if (values.trial_enabled) {
        if (!isWhole || Number(days) < 1) {
          ctx.addIssue({ code: 'custom', path: ['trial_days'], message: t('trialDaysRequired') })
        } else if (Number(days) > TRIAL_DAYS_MAX) {
          ctx.addIssue({ code: 'custom', path: ['trial_days'], message: t('trialDaysInvalid', { max: TRIAL_DAYS_MAX }) })
        }
      } else if (days !== '' && (!isWhole || Number(days) > TRIAL_DAYS_MAX)) {
        ctx.addIssue({ code: 'custom', path: ['trial_days'], message: t('trialDaysInvalid', { max: TRIAL_DAYS_MAX }) })
      }
    })
}

export type PlanFormValues = z.infer<ReturnType<typeof createPlanSchema>>

/** A blank Create Plan form — the screenshot's defaults (0s, Active on). */
export const EMPTY_PLAN_FORM: PlanFormValues = {
  name: '',
  description: '',
  monthly_price: '0',
  yearly_price: '',
  max_projects: '0',
  storage_limit_gb: '0',
  trial_enabled: false,
  trial_days: '0',
  ai_integration: false,
  is_active: true,
  is_default: false,
}

/** Edit form prefill from the API resource. */
export function planToFormValues(plan: Plan): PlanFormValues {
  return {
    name: plan.name,
    description: plan.description ?? '',
    monthly_price: plan.monthly_price,
    yearly_price: plan.yearly_price,
    max_projects: String(plan.max_projects),
    storage_limit_gb: plan.storage_limit_gb,
    trial_enabled: plan.trial_enabled,
    trial_days: String(plan.trial_days),
    ai_integration: plan.ai_integration,
    is_active: plan.is_active,
    is_default: plan.is_default,
  }
}

/** Validated form values → API payload. Trial off sends 0 days; empty yearly price sends null. */
export function formValuesToPayload(values: PlanFormValues): PlanPayload {
  return {
    name: values.name,
    description: values.description === '' ? null : values.description,
    monthly_price: values.monthly_price,
    yearly_price: values.yearly_price === '' ? null : values.yearly_price,
    max_projects: Number(values.max_projects),
    storage_limit_gb: values.storage_limit_gb,
    trial_enabled: values.trial_enabled,
    trial_days: values.trial_enabled ? Number(values.trial_days) : 0,
    ai_integration: values.ai_integration,
    is_active: values.is_default ? true : values.is_active, // a default plan is always active
    is_default: values.is_default,
  }
}
