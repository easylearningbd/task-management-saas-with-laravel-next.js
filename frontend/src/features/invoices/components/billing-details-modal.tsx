'use client'

import * as React from 'react'
import { useForm, type FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { FormModal } from '@/components/shared/form-modal'
import { toast } from '@/components/ui/toast'
import { TextField } from '@/features/auth/components/text-field'
import { useAuthFormError } from '@/features/auth/components/use-auth-form-error'
import { useUpdateInvoiceSettings } from '@/features/invoices/api'
import { createSettingsSchema, type SettingsFormValues } from '@/features/invoices/schema'
import { INVOICE_SETTING_FIELDS, type InvoiceSettings } from '@/features/invoices/types'
import { orNull } from '@/lib/form-values'

/* Billing Details (PAGE SPEC C): the company's "Billed From" block — company name*, email*, phone,
   address, city, state, ZIP, country — editable here until the Settings page exists. The 872px modal
   with two columns (one on phones), the address across both. Saving updates every invoice's Billed
   From (the share page included); a 422 lands under its field. Mounted afresh for each opening. */

const FIELDS = INVOICE_SETTING_FIELDS satisfies ReadonlyArray<FieldPath<SettingsFormValues>>

const MAX: Record<keyof InvoiceSettings, number> = { company_name: 255, email: 255, phone: 50, address: 255, city: 100, state: 100, zip: 20, country: 100 }

export function BillingDetailsModal({
  open,
  onOpenChange,
  settings,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: InvoiceSettings | undefined
}) {
  const t = useTranslations('invoices.billingDetails')
  const tValidation = useTranslations('invoices.validation')
  const update = useUpdateInvoiceSettings()

  const schema = React.useMemo(() => createSettingsSchema(tValidation), [tValidation])
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(schema),
    defaultValues: Object.fromEntries(INVOICE_SETTING_FIELDS.map((field) => [field, settings?.[field] ?? ''])) as SettingsFormValues,
  })
  const { formError, setFormError, handleError } = useAuthFormError(setError, FIELDS)

  const onSubmit = (values: SettingsFormValues) => {
    setFormError(null)
    const payload = Object.fromEntries(INVOICE_SETTING_FIELDS.map((field) => [field, orNull(values[field])])) as Record<keyof InvoiceSettings, string | null>
    update.mutate(payload, {
      onSuccess: () => {
        toast.success(t('saved'))
        onOpenChange(false)
      },
      onError: handleError,
    })
  }

  const field = (name: keyof InvoiceSettings, props: { required?: boolean; type?: string; autoComplete?: string; className?: string } = {}) => (
    <div className={props.className}>
      <TextField
        label={t(name === 'company_name' ? 'companyName' : name)}
        required={props.required}
        type={props.type}
        autoComplete={props.autoComplete ?? 'off'}
        maxLength={MAX[name]}
        error={errors[name]?.message}
        {...register(name)}
      />
    </div>
  )

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('title')}
      description={t('description')}
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={t('save')}
      cancelLabel={t('cancel')}
      pending={update.isPending}
      dirty={isDirty}
      error={formError}
      divided
    >
      <div className="grid grid-cols-1 gap-x-4 gap-y-4.5 sm:grid-cols-2">
        {field('company_name', { required: true, autoComplete: 'organization' })}
        {field('email', { required: true, type: 'email', autoComplete: 'email' })}
        {field('phone', { type: 'tel', autoComplete: 'tel' })}
        {field('country', { autoComplete: 'country-name' })}
        {field('address', { autoComplete: 'street-address', className: 'sm:col-span-2' })}
        {field('city', { autoComplete: 'address-level2' })}
        {field('state', { autoComplete: 'address-level1' })}
        {field('zip', { autoComplete: 'postal-code' })}
      </div>
    </FormModal>
  )
}
