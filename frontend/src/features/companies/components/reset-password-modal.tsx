'use client'

import * as React from 'react'
import { useForm, useWatch, type FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { FormModal } from '@/components/shared/form-modal'
import { Alert } from '@/components/ui/alert'
import { ProgressBar } from '@/components/ui/progress-bar'
import { toast } from '@/components/ui/toast'
import { TextField } from '@/features/auth/components/text-field'
import { useAuthFormError } from '@/features/auth/components/use-auth-form-error'
import { useResetCompanyPassword } from '@/features/companies/api'
import {
  createResetPasswordSchema,
  EMPTY_RESET_PASSWORD,
  passwordStrength,
  toResetPayload,
  type ResetPasswordValues,
} from '@/features/companies/schema'
import type { Company } from '@/features/companies/types'

/* Reset Password (task spec, Phase 7): a 468px modal with New Password* and Confirm Password*,
   a strength hint, and a warning that the company needs the new password to sign in (the
   server also signs out its open sessions). The hint is advisory — the rule is min 8.
   Strength bar: ProgressBar's `warning` tone while weak or fair, `info` when good, `primary`
   when strong (ProgressBar.md allows info/warning for "nearing" states). */

const FIELDS = ['password', 'password_confirmation'] as const satisfies ReadonlyArray<FieldPath<ResetPasswordValues>>
const TONES = { 1: 'warning', 2: 'warning', 3: 'info', 4: 'primary' } as const

export function ResetPasswordModal({
  open,
  company,
  onOpenChange,
}: {
  open: boolean
  /** Kept while closing; give the modal a new `key` per opening for a blank form. */
  company: Company | null
  onOpenChange: (open: boolean) => void
}) {
  const t = useTranslations('companies.resetPassword')
  const tValidation = useTranslations('companies.validation')
  const reset = useResetCompanyPassword(company?.id ?? 0)
  const schema = React.useMemo(() => createResetPasswordSchema(tValidation), [tValidation])

  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<ResetPasswordValues>({ resolver: zodResolver(schema), defaultValues: EMPTY_RESET_PASSWORD })
  const { formError, setFormError, handleError } = useAuthFormError(setError, FIELDS)

  const password = useWatch({ control, name: 'password' })
  const strength = passwordStrength(password)

  const onSubmit = (values: ResetPasswordValues) => {
    setFormError(null)
    reset.mutate(toResetPayload(values), {
      onSuccess: () => {
        toast.success(t('done'))
        onOpenChange(false)
      },
      onError: handleError,
    })
  }

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('title')}
      description={company ? t('subtitle', { name: company.name }) : undefined}
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={t('submit')}
      cancelLabel={t('cancel')}
      pending={reset.isPending}
      dirty={isDirty}
      error={formError}
      size="sm"
      divided
    >
      <div className="flex flex-col gap-4.5">
        <div className="flex flex-col gap-2">
          <TextField
            label={t('newPassword')}
            type="password"
            placeholder={t('newPasswordPlaceholder')}
            required
            autoComplete="new-password"
            error={errors.password?.message}
            {...register('password')}
          />
          {strength > 0 ? (
            <div className="flex items-center gap-3">
              <ProgressBar value={strength * 25} tone={TONES[strength as 1 | 2 | 3 | 4]} label={t('strengthLabel')} className="flex-1" />
              <span className="text-caption text-muted-foreground" aria-live="polite">
                {t('strengthHint', { level: t(`strength.${strength as 1 | 2 | 3 | 4}`) })}
              </span>
            </div>
          ) : null}
        </div>
        <TextField
          label={t('confirmPassword')}
          type="password"
          placeholder={t('confirmPasswordPlaceholder')}
          required
          autoComplete="new-password"
          error={errors.password_confirmation?.message}
          {...register('password_confirmation')}
        />
        <Alert tone="warning">{t('warning')}</Alert>
      </div>
    </FormModal>
  )
}
