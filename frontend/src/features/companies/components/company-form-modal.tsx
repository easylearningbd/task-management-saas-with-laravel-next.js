'use client'

import * as React from 'react'
import { Controller, useForm, useWatch, type FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { FormModal } from '@/components/shared/form-modal'
import { Field, FieldMessage } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/components/ui/toast'
import { TextField } from '@/features/auth/components/text-field'
import { useAuthFormError } from '@/features/auth/components/use-auth-form-error'
import { useCompany, useCreateCompany, useUpdateCompany } from '@/features/companies/api'
import {
  companyToFormValues,
  createCompanySchema,
  EMPTY_COMPANY_FORM,
  toCreatePayload,
  toUpdatePayload,
  type CompanyFormValues,
} from '@/features/companies/schema'
import type { Company } from '@/features/companies/types'

/* Add New Company / Edit Company — PAGE SPEC B and the Add New Company screenshot: the 468px
   modal (Modal.md names this very modal) with a rule under the header and one column:
     Company Name* · Email* · [edit: Status] · Enable Login [switch]
     → when Enable Login is on: Password* · Confirm Password*
   Create: login off by default; off = no usable password, the company can't sign in.
   Edit: prefilled; password optional (blank keeps it); turning login on for a company that
   never had a password asks for one (has_password comes from the details endpoint).
   422s land under their field (a taken email under Email). */

const FIELDS = ['name', 'email', 'status', 'enable_login', 'password', 'password_confirmation'] as const satisfies ReadonlyArray<
  FieldPath<CompanyFormValues>
>

export function CompanyFormModal({
  open,
  onOpenChange,
  company,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Edit this company; omit to create. */
  company?: Company | null
}) {
  const t = useTranslations('companies.form')
  const tValidation = useTranslations('companies.validation')
  const tCommon = useTranslations('common')
  const isEdit = Boolean(company)
  const detail = useCompany(isEdit && open ? (company?.id ?? null) : null)
  const create = useCreateCompany()
  const update = useUpdateCompany(company?.id ?? 0)
  const mutation = isEdit ? update : create

  // Until the details arrive assume a password exists; the server re-checks either way.
  const hasPassword = detail.data?.has_password ?? true
  const wasLoginEnabled = company?.is_login_enabled ?? false
  const schema = React.useMemo(
    () => createCompanySchema(tValidation, isEdit ? { mode: 'edit', hasPassword, wasLoginEnabled } : { mode: 'create' }),
    [tValidation, isEdit, hasPassword, wasLoginEnabled],
  )

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    clearErrors,
    formState: { errors, isDirty },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(schema),
    defaultValues: company ? companyToFormValues(company) : EMPTY_COMPANY_FORM,
  })
  const { formError, setFormError, handleError } = useAuthFormError(setError, FIELDS)

  const enableLogin = useWatch({ control, name: 'enable_login' })
  const showPassword = enableLogin
  const passwordRequired = !isEdit || (!wasLoginEnabled && !hasPassword)

  const onSubmit = (values: CompanyFormValues) => {
    setFormError(null)
    const done = {
      onSuccess: () => {
        toast.success(isEdit ? t('updated') : t('created'))
        onOpenChange(false) // straight to the parent: a saved form has nothing to discard
      },
      onError: handleError,
    }
    if (isEdit) update.mutate(toUpdatePayload(values), done)
    else create.mutate(toCreatePayload(values), done)
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

        {isEdit ? <StatusField control={control} label={t('status')} activeLabel={t('active')} inactiveLabel={t('inactive')} requiredLabel={tCommon('requiredField')} /> : null}

        <Controller
          control={control}
          name="enable_login"
          render={({ field }) => (
            <SwitchRow
              label={t('enableLogin')}
              checked={field.value}
              onCheckedChange={(on) => {
                field.onChange(on)
                if (!on && !isEdit) {
                  // Create with login off: the password is discarded, so are its errors.
                  setValue('password', '')
                  setValue('password_confirmation', '')
                  clearErrors(['password', 'password_confirmation'])
                }
              }}
            />
          )}
        />

        {showPassword ? (
          <>
            <TextField
              label={t('password')}
              type="password"
              placeholder={t('passwordPlaceholder')}
              required={passwordRequired}
              autoComplete="new-password"
              hint={isEdit ? (hasPassword ? t('keepPasswordHint') : t('noPasswordHint')) : undefined}
              error={errors.password?.message}
              {...register('password')}
            />
            <TextField
              label={t('confirmPassword')}
              type="password"
              placeholder={t('confirmPasswordPlaceholder')}
              required={passwordRequired}
              autoComplete="new-password"
              error={errors.password_confirmation?.message}
              {...register('password_confirmation')}
            />
          </>
        ) : null}
      </div>
    </FormModal>
  )
}

/** "Enable Login" with its switch right beside the label, as in the screenshot. */
function SwitchRow({ label, checked, onCheckedChange }: { label: string; checked: boolean; onCheckedChange: (on: boolean) => void }) {
  const id = React.useId()
  return (
    <div className="flex items-center gap-2.5">
      <Label htmlFor={id}>{label}</Label>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

function StatusField({
  control,
  label,
  activeLabel,
  inactiveLabel,
  requiredLabel,
}: {
  control: import('react-hook-form').Control<CompanyFormValues>
  label: string
  activeLabel: string
  inactiveLabel: string
  requiredLabel: string
}) {
  const id = React.useId()
  return (
    <Controller
      control={control}
      name="status"
      render={({ field, fieldState }) => (
        <Field>
          <Label htmlFor={id} required requiredLabel={requiredLabel}>
            {label}
          </Label>
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger id={id} ref={field.ref} aria-invalid={fieldState.error ? true : undefined}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">{activeLabel}</SelectItem>
              <SelectItem value="inactive">{inactiveLabel}</SelectItem>
            </SelectContent>
          </Select>
          {fieldState.error ? <FieldMessage error>{fieldState.error.message}</FieldMessage> : null}
        </Field>
      )}
    />
  )
}
