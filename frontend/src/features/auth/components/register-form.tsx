'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { useRegister } from '@/features/auth/api'
import { TextField } from '@/features/auth/components/text-field'
import { useAuthFormError } from '@/features/auth/components/use-auth-form-error'
import { createRegisterSchema, PASSWORD_MIN, type RegisterValues } from '@/features/auth/schema'
import { HOME } from '@/lib/routes'

const FIELDS = ['name', 'email', 'password', 'password_confirmation'] as const

/* Public sign-up — always creates a company account (the backend ignores any role input). */
export function RegisterForm() {
  const t = useTranslations('auth')
  const tValidation = useTranslations('auth.validation')
  const router = useRouter()
  const registration = useRegister()

  const schema = React.useMemo(() => createRegisterSchema(tValidation), [tValidation])
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '', password_confirmation: '' },
  })

  const { formError, setFormError, handleError } = useAuthFormError(setError, FIELDS)

  const onSubmit = (values: RegisterValues) => {
    setFormError(null)
    registration.mutate(values, {
      onSuccess: () => router.replace(HOME.company),
      onError: handleError,
    })
  }

  const busy = registration.isPending || registration.isSuccess

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      {formError ? <Alert tone="danger">{formError}</Alert> : null}

      <TextField
        label={t('fields.name')}
        autoComplete="organization"
        placeholder={t('placeholders.name')}
        required
        error={errors.name?.message}
        {...register('name')}
      />

      <TextField
        label={t('fields.email')}
        type="email"
        autoComplete="email"
        inputMode="email"
        placeholder={t('placeholders.email')}
        required
        error={errors.email?.message}
        {...register('email')}
      />

      <TextField
        label={t('fields.password')}
        type="password"
        autoComplete="new-password"
        placeholder={t('placeholders.password')}
        required
        hint={t('register.passwordHint', { min: PASSWORD_MIN })}
        error={errors.password?.message}
        {...register('password')}
      />

      <TextField
        label={t('fields.passwordConfirmation')}
        type="password"
        autoComplete="new-password"
        placeholder={t('placeholders.passwordConfirmation')}
        required
        error={errors.password_confirmation?.message}
        {...register('password_confirmation')}
      />

      <Button type="submit" size="lg" className="w-full" loading={busy} disabled={busy}>
        {t('register.submit')}
      </Button>
    </form>
  )
}
