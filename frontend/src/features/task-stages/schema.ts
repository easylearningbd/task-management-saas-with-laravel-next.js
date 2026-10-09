import { z } from 'zod'
import type { useTranslations } from 'next-intl'
import { HEX_COLOR } from '@/lib/hex-color'
import { TASK_STAGE_STATUSES, type TaskStage, type TaskStagePayload } from '@/features/task-stages/types'

/* Mirrors backend StoreTaskStageRequest / UpdateTaskStageRequest (messages too — en.json
   taskStages.validation carries the same wording):
   name           required | max:255 | unique within the company, any case (server — its 422
                  lands under Stage Name); trimmed
   description    optional | max:1000                ("" → null)
   color          required | #RRGGBB (either case)    (stored uppercase)
   order          optional | whole number | 1..10000  ("" → null: at the end / keep its place)
   status         active | inactive (default active)
   is_done_stage  boolean (default false)
   The workflow rules (one done stage, a done stage is active, the last active stage) are the
   server's: they come back as a 422 under `stage`, shown above the fields. */

export const NAME_MAX = 255
export const DESCRIPTION_MAX = 1000
export const ORDER_MAX = 10000
/** The form's starting colour (the Add New Task Stage screenshot). */
export const DEFAULT_COLOR = '#3B82F6'

type ValidationT = ReturnType<typeof useTranslations<'taskStages.validation'>>

export function createTaskStageSchema(t: ValidationT) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, { error: t('nameRequired') })
      .max(NAME_MAX, { error: t('nameMax', { max: NAME_MAX }) }),
    description: z
      .string()
      .trim()
      .max(DESCRIPTION_MAX, { error: t('descriptionMax', { max: DESCRIPTION_MAX }) }),
    color: z
      .string()
      .trim()
      .min(1, { error: t('colorRequired') })
      .regex(HEX_COLOR, { error: t('colorInvalid') }),
    // A text field, as typed: "" (none) or a whole number — the same checks, in the same order,
    // as Laravel's integer → min → max.
    order: z
      .string()
      .trim()
      .refine((value) => value === '' || /^-?\d+$/.test(value), { error: t('orderInteger') })
      .refine((value) => value === '' || !/^-?\d+$/.test(value) || Number(value) >= 1, { error: t('orderMin', { min: 1 }) })
      .refine((value) => value === '' || !/^-?\d+$/.test(value) || Number(value) <= ORDER_MAX, { error: t('orderMax', { max: ORDER_MAX }) }),
    status: z.enum(TASK_STAGE_STATUSES, { error: t('statusInvalid') }),
    is_done_stage: z.boolean(),
  })
}

export type TaskStageFormValues = z.infer<ReturnType<typeof createTaskStageSchema>>

export const EMPTY_TASK_STAGE_FORM: TaskStageFormValues = {
  name: '',
  description: '',
  color: DEFAULT_COLOR,
  order: '',
  status: 'active',
  is_done_stage: false,
}

/** Edit prefill: a missing description becomes an empty field; the order shows its number. */
export function taskStageToFormValues(stage: TaskStage): TaskStageFormValues {
  return {
    name: stage.name,
    description: stage.description ?? '',
    color: stage.color.toUpperCase(),
    order: String(stage.order),
    status: stage.status,
    is_done_stage: stage.is_done_stage,
  }
}

/** The request body for create and update — an empty description / order is sent as null. */
export function toTaskStagePayload(values: TaskStageFormValues): TaskStagePayload {
  const description = values.description.trim()
  const order = values.order.trim()
  return {
    name: values.name.trim(),
    description: description === '' ? null : description,
    color: values.color.trim().toUpperCase(),
    order: order === '' ? null : Number(order),
    status: values.status,
    is_done_stage: values.is_done_stage,
  }
}
