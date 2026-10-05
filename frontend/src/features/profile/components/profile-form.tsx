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
import { useUpdateProfile } from '@/features/profile/api'
import { AvatarField } from '@/features/profile/components/avatar-field'
import { SettingsCard } from '@/features/profile/components/settings-card'
import { createProfileSchema, type ProfileValues } from '@/features/profile/schema'
import type { Profile } from '@/features/profile/types'

const FIELDS = ['name', 'email'] as const

/* Card 1 — "Profile Information": avatar row, Name*, Email address*, Save (left-aligned).
   Its own form and submit state; the avatar uploads separately from Save. */
export function ProfileForm({ profile }: { profile: Profile }) {
  const t = useTranslations('profile.info')
  const tValidation = useTranslations('profile.validation')
  const update = useUpdateProfile()
  const schema = React.useMemo(() => createProfileSchema(tValidation), [tValidation])

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<ProfileValues>({
    resolver: zodResolver(schema),
    // `values` keeps the form in step with the saved profile (e.g. after a successful save).
    values: { name: profile.name, email: profile.email },
  })

  const { formError, setFormError, handleError } = useAuthFormError(setError, FIELDS)

  const onSubmit = (values: ProfileValues) => {
    setFormError(null)
    update.mutate(values, {
      onSuccess: () => toast.success(t('saved')),
      onError: handleError,
    })
  }

  return (
    <SettingsCard id="profile" title={t('title')} subtitle={t('subtitle')}>
      <AvatarField profile={profile} />

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="mt-5 flex flex-col gap-5">
        {formError ? <Alert tone="danger">{formError}</Alert> : null}

        <TextField
          label={t('name')}
          autoComplete="name"
          required
          error={errors.name?.message}
          {...register('name')}
        />
        <TextField
          label={t('email')}
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          error={errors.email?.message}
          {...register('email')}
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
