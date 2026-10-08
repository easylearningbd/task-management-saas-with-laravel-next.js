import { z } from 'zod'
import type { useTranslations } from 'next-intl'
import { HEX_COLOR } from '@/lib/hex-color'
import {
  EXPENSE_CATEGORY_STATUSES,
  type ExpenseCategory,
  type ExpenseCategoryPayload,
} from '@/features/expense-categories/types'

/* Mirrors backend StoreExpenseCategoryRequest / UpdateExpenseCategoryRequest (messages too —
   en.json expenseCategories.validation carries the same wording):
   name         required | max:255 | unique within the company, any case (server — its 422
                lands under Category Name); trimmed
   status       active | inactive (default active)
   description  optional | max:1000                 ("" → null)
   color        required | #RRGGBB (either case)     (stored uppercase)
   Every text is trimmed first, as the server does. */

export const NAME_MAX = 255
export const DESCRIPTION_MAX = 1000
/** The form's starting colour — the screenshot's (Travel's) blue. */
export const DEFAULT_COLOR = '#3B82F6'

type ValidationT = ReturnType<typeof useTranslations<'expenseCategories.validation'>>

export function createExpenseCategorySchema(t: ValidationT) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, { error: t('nameRequired') })
      .max(NAME_MAX, { error: t('nameMax', { max: NAME_MAX }) }),
    status: z.enum(EXPENSE_CATEGORY_STATUSES, { error: t('statusInvalid') }),
    description: z
      .string()
      .trim()
      .max(DESCRIPTION_MAX, { error: t('descriptionMax', { max: DESCRIPTION_MAX }) }),
    color: z
      .string()
      .trim()
      .min(1, { error: t('colorRequired') })
      .regex(HEX_COLOR, { error: t('colorInvalid') }),
  })
}

export type ExpenseCategoryFormValues = z.infer<ReturnType<typeof createExpenseCategorySchema>>

export const EMPTY_EXPENSE_CATEGORY_FORM: ExpenseCategoryFormValues = {
  name: '',
  status: 'active',
  description: '',
  color: DEFAULT_COLOR,
}

/** Edit prefill: a missing description becomes an empty field. */
export function expenseCategoryToFormValues(category: ExpenseCategory): ExpenseCategoryFormValues {
  return {
    name: category.name,
    status: category.status,
    description: category.description ?? '',
    color: category.color.toUpperCase(),
  }
}

/** The request body for create and update — an empty description is sent as null. */
export function toExpenseCategoryPayload(values: ExpenseCategoryFormValues): ExpenseCategoryPayload {
  const description = values.description.trim()
  return {
    name: values.name.trim(),
    description: description === '' ? null : description,
    color: values.color.trim().toUpperCase(),
    status: values.status,
  }
}
