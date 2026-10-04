'use client'

import * as React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useAdminLogin, useLogin } from '@/features/auth/api'
import { TextField } from '@/features/auth/components/text-field'
import { useAuthFormError } from '@/features/auth/components/use-auth-form-error'
import { createLoginSchema, type LoginValues } from '@/features/auth/schema'
import { HOME } from '@/lib/routes'

export type LoginVariant = 'company' | 'admin'

/* One form, two endpoints. Each login page accepts only its own role — the backend
   answers 403 for the other one, which lands in the form alert. */
const VARIANTS = {
  company: {
    useMutation: useLogin,
    redirectTo: HOME.company,
    demo: { email: 'company@example.com', labelKey: 'loginAsCompany' },
  },
  admin: {
    useMutation: useAdminLogin,
    redirectTo: HOME.super_admin,
    demo: { email: 'superadmin@example.com', labelKey: 'loginAsSuperAdmin' },
  },
} as const

/** Password of the seeded demo accounts (AdminUserSeeder). Only used when demo mode is on. */
const DEMO_PASSWORD = 'password'

const FIELDS = ['email', 'password'] as const

export function LoginForm({ variant, demoMode }: { variant: LoginVariant; demoMode: boolean }) {
  const t = useTranslations('auth')
  const tValidation = useTranslations('auth.validation')
  const router = useRouter()
  const config = VARIANTS[variant]
  const login = config.useMutation()
  const [source, setSource] = React.useState<'form' | 'demo'>('form')

  const schema = React.useMemo(() => createLoginSchema(tValidation), [tValidation])
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', remember: false },
  })

  const { formError, setFormError, handleError } = useAuthFormError(setError, FIELDS)

  const submit = (values: LoginValues, from: 'form' | 'demo') => {
    setSource(from)
    setFormError(null)
    login.mutate(values, {
      onSuccess: () => router.replace(config.redirectTo),
      onError: handleError,
    })
  }

  const busy = login.isPending || login.isSuccess

  return (
    <div className="flex flex-col gap-6">
      <form noValidate onSubmit={handleSubmit((values) => submit(values, 'form'))} className="flex flex-col gap-4">
        {formError ? <Alert tone="danger">{formError}</Alert> : null}

        <TextField
          label={t('fields.email')}
          type="email"
          autoComplete="username"
          inputMode="email"
          placeholder={t('placeholders.email')}
          required
          error={errors.email?.message}
          {...register('email')}
        />

        <TextField
          label={t('fields.password')}
          type="password"
          autoComplete="current-password"
          placeholder={t('placeholders.password')}
          required
          error={errors.password?.message}
          labelAction={
            <Link
              href="/forgot-password"
              className="rounded-sm text-body-sm font-medium text-primary-strong hover:underline focus-visible:shadow-focus focus-visible:outline-none"
            >
              {t('login.forgotPassword')}
            </Link>
          }
          {...register('password')}
        />

        <Controller
          control={control}
          name="remember"
          render={({ field }) => (
            <div className="flex items-center gap-2">
              <Checkbox
                id="remember"
                name={field.name}
                checked={field.value}
                onCheckedChange={(checked) => field.onChange(checked === true)}
                onBlur={field.onBlur}
                ref={field.ref}
              />
              <Label htmlFor="remember" className="text-body">
                {t('fields.remember')}
              </Label>
            </div>
          )}
        />

        <Button type="submit" size="lg" className="w-full" loading={busy && source === 'form'} disabled={busy}>
          {t('login.submit')}
        </Button>
      </form>

      {demoMode ? (
        <div className="flex flex-col gap-3 border-t border-border pt-6">
          <p className="text-center text-caption text-muted-foreground">{t('quickAccess.title')}</p>
          <Button
            variant="outline"
            className="w-full"
            loading={busy && source === 'demo'}
            disabled={busy}
            onClick={() => submit({ email: config.demo.email, password: DEMO_PASSWORD, remember: false }, 'demo')}
          >
            {t(`quickAccess.${config.demo.labelKey}`)}
          </Button>
        </div>
      ) : null}
    </div>
  )
}
