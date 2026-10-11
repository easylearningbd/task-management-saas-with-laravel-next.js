'use client'

import * as React from 'react'
import { useForm, type FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { TextareaField } from '@/components/shared/form-fields'
import { FormModal } from '@/components/shared/form-modal'
import { toast } from '@/components/ui/toast'
import { useAuthFormError } from '@/features/auth/components/use-auth-form-error'
import { useRejectPlanOrder } from '@/features/plan-requests/api'
import { createRejectSchema, EMPTY_REJECT_FORM, type RejectFormValues } from '@/features/plan-requests/schema'
import { REJECT_REASON_MAX, type AdminPlanOrder } from '@/features/plan-requests/types'
import { useMoney } from '@/lib/format-money'

/* ✗ — Reject (task PAGE SPEC A): the small (468px) FormModal — the order in one line under the
   title ("ORD-2026-0003 · Healthcare Systems · Pro (Yearly) · $479.90"), a required "Reason for
   rejection" textarea (≤ 500, the zod schema mirrors the server; a 422 lands under it), and
   Cancel / a `destructive` Reject with its spinner. Anything that isn't about the reason (the order
   was reviewed meanwhile) shows in the form's alert. The company reads the reason on its own Plan
   Requests page. A new `key` per opening gives an empty form. */

const FIELDS = ['reason'] as const satisfies ReadonlyArray<FieldPath<RejectFormValues>>

export function PlanRequestRejectModal({
  open,
  onOpenChange,
  order,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  order: AdminPlanOrder | null
}) {
  const t = useTranslations('planRequests.reject')
  const tValidation = useTranslations('planRequests.validation')
  const money = useMoney()
  const reject = useRejectPlanOrder()
  const schema = React.useMemo(() => createRejectSchema(tValidation), [tValidation])
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<RejectFormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY_REJECT_FORM })
  const { formError, setFormError, handleError } = useAuthFormError(setError, FIELDS)

  const onSubmit = (values: RejectFormValues) => {
    if (!order) return
    setFormError(null)
    reject.mutate(
      { id: order.id, reason: values.reason },
      {
        onSuccess: (rejected) => {
          toast.success(t('rejected', { company: rejected.company?.name ?? '' }))
          onOpenChange(false)
        },
        onError: handleError,
      },
    )
  }

  const summary = order
    ? t('summary', {
        code: order.order_code,
        company: order.company?.name ?? '-',
        plan: order.plan?.name ?? '-',
        duration: order.duration_label,
        amount: money(order.final_amount),
      })
    : null

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('title')}
      description={summary}
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={t('submit')}
      submitTone="destructive"
      pending={reject.isPending}
      dirty={isDirty}
      error={formError}
      size="sm"
      divided
    >
      <TextareaField
        label={t('reason')}
        placeholder={t('placeholder')}
        required
        rows={4}
        maxLength={REJECT_REASON_MAX}
        hint={t('hint')}
        error={errors.reason?.message}
        {...register('reason')}
      />
    </FormModal>
  )
}
