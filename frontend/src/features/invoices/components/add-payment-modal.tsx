'use client'

import * as React from 'react'
import { Controller, useForm, type FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { FormModal } from '@/components/shared/form-modal'
import { SelectField, TextareaField } from '@/components/shared/form-fields'
import { Field, FieldMessage } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { MoneyInput } from '@/components/ui/money-input'
import { toast } from '@/components/ui/toast'
import { useAuthFormError } from '@/features/auth/components/use-auth-form-error'
import { useAddPayment } from '@/features/invoices/api'
import { createPaymentSchema, EMPTY_PAYMENT_FORM, PAYMENT_NOTES_MAX, toPaymentPayload, type PaymentFormValues } from '@/features/invoices/schema'
import { PAYMENT_TYPES, type Invoice } from '@/features/invoices/types'
import { useMoney } from '@/lib/format-money'

/* Add Payment (PAGE SPEC C): the 468px modal — Payment Amount* ("Enter amount"; the balance due is
   the maximum, shown under the field and enforced here and by the server, which answers 422 naming
   the balance), Payment Method (Bank Transfer by default), Notes ("Payment notes (optional)").
   Footer Cancel / green "Add Payment". On success the server's recalculated invoice goes into the
   cache (useAddPayment): the totals, the payment history, the status badge and the list all
   refresh; the modal closes with a toast. The parent mounts it afresh (a `key`) for each opening. */

const FIELDS = ['amount', 'payment_type', 'description'] as const satisfies ReadonlyArray<FieldPath<PaymentFormValues>>

export function AddPaymentModal({ open, onOpenChange, invoice }: { open: boolean; onOpenChange: (open: boolean) => void; invoice: Invoice }) {
  const t = useTranslations('invoices.payment')
  const tTypes = useTranslations('invoices.paymentTypes')
  const tValidation = useTranslations('invoices.validation')
  const tCommon = useTranslations('common')
  const money = useMoney()
  const add = useAddPayment(invoice.id)
  const amountId = React.useId()
  const balance = invoice.balance_due

  // The maximum is the balance as the modal opened; the server re-checks it under a lock.
  const schema = React.useMemo(() => createPaymentSchema(tValidation, balance, money(balance)), [tValidation, money, balance])
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<PaymentFormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY_PAYMENT_FORM })
  const { formError, setFormError, handleError } = useAuthFormError(setError, FIELDS)

  const onSubmit = (values: PaymentFormValues) => {
    setFormError(null)
    add.mutate(toPaymentPayload(values), {
      onSuccess: ({ data }) => {
        toast.success(t('added', { amount: money(data.amount) }))
        onOpenChange(false)
      },
      onError: handleError,
    })
  }

  const amountError = errors.amount?.message
  const messageId = `${amountId}-message`

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('title')}
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={t('submit')}
      cancelLabel={t('cancel')}
      pending={add.isPending}
      dirty={isDirty}
      error={formError}
      size="sm"
      divided
    >
      <div className="flex flex-col gap-4.5">
        <Field>
          <Label htmlFor={amountId} required requiredLabel={tCommon('requiredField')}>
            {t('amount')}
          </Label>
          <MoneyInput
            id={amountId}
            placeholder={t('amountPlaceholder')}
            aria-invalid={amountError ? true : undefined}
            aria-describedby={messageId}
            aria-required
            {...register('amount')}
          />
          <FieldMessage id={messageId} error={amountError !== undefined}>
            {amountError ?? t('amountHint', { balance: money(balance) })}
          </FieldMessage>
        </Field>
        <Controller
          control={control}
          name="payment_type"
          render={({ field, fieldState }) => (
            <SelectField
              label={t('method')}
              value={field.value}
              onValueChange={field.onChange}
              triggerRef={field.ref}
              options={PAYMENT_TYPES.map((type) => ({ value: type, label: tTypes(type) }))}
              error={fieldState.error?.message}
            />
          )}
        />
        <TextareaField
          label={t('notes')}
          placeholder={t('notesPlaceholder')}
          rows={3}
          maxLength={PAYMENT_NOTES_MAX}
          error={errors.description?.message}
          {...register('description')}
        />
      </div>
    </FormModal>
  )
}
