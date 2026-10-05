'use client'

import * as React from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toast'
import { TextField } from '@/features/auth/components/text-field'
import { useAuthFormError } from '@/features/auth/components/use-auth-form-error'
import { useUpdatePassword } from '@/features/profile/api'
import { SettingsCard } from '@/features/profile/components/settings-card'
import { createPasswordSchema, type PasswordValues } from '@/features/profile/schema'

const FIELDS = ['current_password', 'password', 'password_confirmation'] as const
const EMPTY: PasswordValues = { current_password: '', password: '', password_confirmation: '' }

/* Card 2 — "Update Password": Current*, New*, Confirm* (placeholder = label, per the spec),
   Save (left-aligned). Its own form; clears itself after a successful save. */
export function PasswordForm({ email }: { email: string }) {
  const t = useTranslations('profile.password')
  const tValidation = useTranslations('profile.validation')
  const update = useUpdatePassword()
  const schema = React.useMemo(() => createPasswordSchema(tValidation), [tValidation])

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors },
  } = useForm<PasswordValues>({ resolver: zodResolver(schema), defaultValues: EMPTY })

  const { formError, setFormError, handleError } = useAuthFormError(setError, FIELDS)

  const onSubmit = (values: PasswordValues) => {
    setFormError(null)
    update.mutate(values, {
      onSuccess: () => {
        reset(EMPTY)
        toast.success(t('saved'))
      },
      onError: handleError,
    })
  }

  return (
    <SettingsCard id="password" title={t('title')} subtitle={t('subtitle')}>
      <form noValidate onSubmit={handleSubmit(onSubmit)} className="mt-5 flex flex-col gap-5">
        {/* Lets password managers file the new password under the right account. */}
        <input type="email" name="username" autoComplete="username" value={email} readOnly hidden />

        {formError ? <Alert tone="danger">{formError}</Alert> : null}

        <TextField
          label={t('current')}
          placeholder={t('current')}
          type="password"
          autoComplete="current-password"
          required
          error={errors.current_password?.message}
          {...register('current_password')}
        />
        <TextField
          label={t('new')}
          placeholder={t('new')}
          type="password"
          autoComplete="new-password"
          required
          error={errors.password?.message}
          {...register('password')}
        />
        <TextField
          label={t('confirm')}
          placeholder={t('confirm')}
          type="password"
          autoComplete="new-password"
          required
          error={errors.password_confirmation?.message}
          {...register('password_confirmation')}
        />

        <div className="mt-1">
          <Button type="submit" loading={update.isPending} disabled={update.isPending}>
            {t('save')}
          </Button>
        </div>
      </form>
    </SettingsCard>
  )
}
