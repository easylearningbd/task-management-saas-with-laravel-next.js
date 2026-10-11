import { z } from 'zod'
import type { useTranslations } from 'next-intl'
import type { DropzoneAccept } from '@/components/shared/file-dropzone'
import { orNull } from '@/lib/form-values'
import type { PlanDuration, PurchasePayload } from '@/features/billing/types'

/* The checkout form, mirroring StorePlanPurchaseRequest (en.json `billing.validation` carries its
   wording):
     payment_method     bank_transfer — the only method the API takes (Stripe is shown disabled)
     receipt*           JPG, PNG or PDF, at most 5 MB — checked here (and by the dropzone) before
                        anything uploads; the server checks again
     payment_reference  optional, max 100
     notes              optional, max 2000
   Text is trimmed, as the server does; empty optionals are sent as null. */

export const RECEIPT_ACCEPT: DropzoneAccept = {
  'image/jpeg': ['jpg', 'jpeg'],
  'image/png': ['png'],
  'application/pdf': ['pdf'],
}
export const RECEIPT_MAX_BYTES = 5 * 1024 * 1024
export const REFERENCE_MAX = 100
export const NOTES_MAX = 2000

type ValidationT = ReturnType<typeof useTranslations<'billing.validation'>>

function receiptProblem(file: File): 'receiptType' | 'receiptSize' | null {
  const extension = (file.name.split('.').pop() ?? '').toLowerCase()
  const allowed = Object.values(RECEIPT_ACCEPT).flat()
  if (!allowed.includes(extension) || (file.type !== '' && !(file.type in RECEIPT_ACCEPT))) return 'receiptType'
  if (file.size > RECEIPT_MAX_BYTES) return 'receiptSize'
  return null
}

export function createCheckoutSchema(t: ValidationT) {
  return z.object({
    // A plain boolean check (not a type guard), so the form's value type keeps both methods.
    payment_method: z.enum(['bank_transfer', 'stripe']).refine((value): boolean => value === 'bank_transfer'),
    receipt: z.custom<File | null>().superRefine((file, ctx) => {
      if (!(file instanceof File)) {
        ctx.addIssue({ code: 'custom', message: t('receiptRequired') })
        return
      }
      const problem = receiptProblem(file)
      if (problem) ctx.addIssue({ code: 'custom', message: t(problem) })
    }),
    payment_reference: z.string().trim().max(REFERENCE_MAX, { error: t('referenceMax', { max: REFERENCE_MAX }) }),
    notes: z.string().trim().max(NOTES_MAX, { error: t('notesMax', { max: NOTES_MAX }) }),
  })
}

export type CheckoutFormValues = z.infer<ReturnType<typeof createCheckoutSchema>>

/** Bank transfer selected, nothing else filled in. */
export const EMPTY_CHECKOUT_FORM: CheckoutFormValues = {
  payment_method: 'bank_transfer',
  receipt: null,
  payment_reference: '',
  notes: '',
}

export function toPurchasePayload(values: CheckoutFormValues, planId: number, duration: PlanDuration): PurchasePayload {
  if (!(values.receipt instanceof File)) throw new Error('A receipt is required (checked by the schema).')
  return {
    plan_id: planId,
    duration,
    payment_method: 'bank_transfer',
    receipt: values.receipt,
    payment_reference: orNull(values.payment_reference),
    notes: orNull(values.notes),
  }
}
