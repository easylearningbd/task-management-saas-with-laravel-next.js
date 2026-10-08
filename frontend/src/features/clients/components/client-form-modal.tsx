'use client'

import * as React from 'react'
import { Controller, useForm, type FieldPath, type UseFormRegisterReturn } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { FormModal } from '@/components/shared/form-modal'
import { Field, FieldMessage } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { TextField } from '@/features/auth/components/text-field'
import { useAuthFormError } from '@/features/auth/components/use-auth-form-error'
import { useCreateClient, useUpdateClient } from '@/features/clients/api'
import {
  clientToFormValues,
  createClientSchema,
  EMPTY_CLIENT_FORM,
  toClientPayload,
  type ClientFormValues,
} from '@/features/clients/schema'
import type { Client } from '@/features/clients/types'

/* Add New Client / Edit Client — PAGE SPEC B and the Add New Client screenshot: the 468px
   modal (Phase 0 decision 4) with a rule under the header and one column, in this order:
     Client Name* · Email* · Phone* · Company* · Address* (textarea) · Website · Status · Notes
   Footer: Cancel (outline) · Save (green). One component for both modes: edit is prefilled
   from the row and keeps its own email. zod mirrors the server; a 422 lands under its field
   (a taken email under Email), anything else in the alert above the fields. FormModal owns
   focus (first field on open, back to the trigger on close) and the unsaved-changes confirm. */

const FIELDS = ['name', 'email', 'phone', 'company_name', 'address', 'website', 'status', 'notes'] as const satisfies ReadonlyArray<
  FieldPath<ClientFormValues>
>

export function ClientFormModal({
  open,
  onOpenChange,
  client,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Edit this client; null to create. */
  client: Client | null
}) {
  const t = useTranslations('clients.form')
  const tValidation = useTranslations('clients.validation')
  const isEdit = client !== null
  const create = useCreateClient()
  const update = useUpdateClient(client?.id ?? 0)
  const mutation = isEdit ? update : create

  const schema = React.useMemo(() => createClientSchema(tValidation), [tValidation])
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(schema),
    defaultValues: client ? clientToFormValues(client) : EMPTY_CLIENT_FORM,
  })
  const { formError, setFormError, handleError } = useAuthFormError(setError, FIELDS)

  const onSubmit = (values: ClientFormValues) => {
    setFormError(null)
    const done = {
      onSuccess: () => {
        toast.success(isEdit ? t('updated') : t('created'))
        onOpenChange(false) // straight to the parent: a saved form has nothing to discard
      },
      onError: handleError,
    }
    if (isEdit) update.mutate(toClientPayload(values), done)
    else create.mutate(toClientPayload(values), done)
  }

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? t('editTitle') : t('createTitle')}
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={t('save')}
      cancelLabel={t('cancel')}
      pending={mutation.isPending}
      dirty={isDirty}
      error={formError}
      size="sm"
      divided
    >
      <div className="flex flex-col gap-4.5">
        <TextField
          label={t('name')}
          placeholder={t('namePlaceholder')}
          required
          autoComplete="off"
          error={errors.name?.message}
          {...register('name')}
        />
        <TextField
          label={t('email')}
          type="email"
          placeholder={t('emailPlaceholder')}
          required
          autoComplete="off"
          error={errors.email?.message}
          {...register('email')}
        />
        <TextField
          label={t('phone')}
          type="tel"
          placeholder={t('phonePlaceholder')}
          required
          autoComplete="off"
          error={errors.phone?.message}
          {...register('phone')}
        />
        <TextField
          label={t('company')}
          placeholder={t('companyPlaceholder')}
          required
          autoComplete="off"
          error={errors.company_name?.message}
          {...register('company_name')}
        />
        <TextareaField
          label={t('address')}
          placeholder={t('addressPlaceholder')}
          required
          error={errors.address?.message}
          registration={register('address')}
        />
        <TextField
          label={t('website')}
          type="url"
          inputMode="url"
          placeholder={t('websitePlaceholder')}
          autoComplete="off"
          error={errors.website?.message}
          {...register('website')}
        />
        <Controller
          control={control}
          name="status"
          render={({ field, fieldState }) => (
            <SelectField
              label={t('status')}
              value={field.value}
              onValueChange={field.onChange}
              triggerRef={field.ref}
              error={fieldState.error?.message}
              options={[
                { value: 'active', label: t('active') },
                { value: 'inactive', label: t('inactive') },
              ]}
            />
          )}
        />
        <TextareaField
          label={t('notes')}
          placeholder={t('notesPlaceholder')}
          error={errors.notes?.message}
          registration={register('notes')}
        />
      </div>
    </FormModal>
  )
}

/** Label + Textarea + error, wired like TextField (`aria-invalid`, `aria-describedby`). */
function TextareaField<Name extends string>({
  label,
  placeholder,
  required = false,
  error,
  registration,
}: {
  label: string
  placeholder: string
  required?: boolean
  error?: string
  registration: UseFormRegisterReturn<Name>
}) {
  const tCommon = useTranslations('common')
  const id = React.useId()
  const messageId = `${id}-message`
  return (
    <Field>
      <Label htmlFor={id} required={required} requiredLabel={tCommon('requiredField')}>
        {label}
      </Label>
      <Textarea
        id={id}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? messageId : undefined}
        aria-required={required || undefined}
        {...registration}
      />
      {error ? (
        <FieldMessage id={messageId} error>
          {error}
        </FieldMessage>
      ) : null}
    </Field>
  )
}

/** Label + the design-system Select (Status: Active / Inactive). */
function SelectField({
  label,
  value,
  onValueChange,
  triggerRef,
  error,
  options,
}: {
  label: string
  value: string
  onValueChange: (value: string) => void
  triggerRef: React.Ref<HTMLButtonElement>
  error?: string
  options: ReadonlyArray<{ value: string; label: string }>
}) {
  const id = React.useId()
  const messageId = `${id}-message`
  return (
    <Field>
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          id={id}
          ref={triggerRef}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? messageId : undefined}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error ? (
        <FieldMessage id={messageId} error>
          {error}
        </FieldMessage>
      ) : null}
    </Field>
  )
}
