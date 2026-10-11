import { z } from 'zod'
import type { useTranslations } from 'next-intl'
import { REJECT_REASON_MAX } from '@/features/plan-requests/types'

/* The reject modal's form, mirroring Admin\RejectPlanOrderRequest: `reason` required (blank or
   whitespace-only is empty — the server trims too) and at most 500 characters. */

type ValidationT = ReturnType<typeof useTranslations<'planRequests.validation'>>

export function createRejectSchema(t: ValidationT) {
  return z.object({
    reason: z
      .string()
      .trim()
      .min(1, { error: t('reasonRequired') })
      .max(REJECT_REASON_MAX, { error: t('reasonMax', { max: REJECT_REASON_MAX }) }),
  })
}

export type RejectFormValues = z.infer<ReturnType<typeof createRejectSchema>>

export const EMPTY_REJECT_FORM: RejectFormValues = { reason: '' }
