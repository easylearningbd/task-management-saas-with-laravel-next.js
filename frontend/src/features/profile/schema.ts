import { z } from 'zod'
import type { useTranslations } from 'next-intl'

/* Mirrors backend validation exactly:
   - UpdateProfileRequest:  name required|max:255 · email required|lowercase|email|max:255|unique (ignoring self)
   - UpdatePasswordRequest: current_password required|current_password · password required|confirmed|
                            Password::defaults() (min 8)|different:current_password
   - UpdateAvatarRequest:   avatar required|image|mimes:jpg,jpeg,png,gif|max:2048 (KB)
   `unique` and the current-password check stay server-side; their 422s land under the field. */

export const NAME_MAX = 255
export const EMAIL_MAX = 255
export const PASSWORD_MIN = 8

/** 2048 KB — the backend's `max:2048`, and the UI's "up to 2MB". */
export const AVATAR_MAX_BYTES = 2048 * 1024
export const AVATAR_MAX_MB = 2
export const AVATAR_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif'] as const
export const AVATAR_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif'] as const
/** For the file picker's `accept`. */
export const AVATAR_ACCEPT = [...AVATAR_MIME_TYPES, ...AVATAR_EXTENSIONS.map((ext) => `.${ext}`)].join(',')

type ValidationT = ReturnType<typeof useTranslations<'profile.validation'>>

export function createProfileSchema(t: ValidationT) {
  return z.object({
    name: z
      .string()
      .trim()
      .min(1, { error: t('nameRequired') })
      .max(NAME_MAX, { error: t('nameMax', { max: NAME_MAX }) }),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, { error: t('emailRequired') })
      .max(EMAIL_MAX, { error: t('emailMax', { max: EMAIL_MAX }) })
      .pipe(z.email({ error: t('emailInvalid') })),
  })
}

export function createPasswordSchema(t: ValidationT) {
  return z
    .object({
      current_password: z.string().min(1, { error: t('currentPasswordRequired') }),
      password: z
        .string()
        .min(1, { error: t('passwordRequired') })
        .min(PASSWORD_MIN, { error: t('passwordMin', { min: PASSWORD_MIN }) }),
      password_confirmation: z.string().min(1, { error: t('passwordConfirmationRequired') }),
    })
    .refine((data) => data.password === data.password_confirmation, {
      error: t('passwordMismatch'),
      path: ['password_confirmation'],
    })
    .refine((data) => !data.current_password || data.password !== data.current_password, {
      error: t('passwordSameAsCurrent'),
      path: ['password'],
    })
}

/** Client-side check before uploading — same type and size limits as the backend. */
export function createAvatarSchema(t: ValidationT) {
  const hasAllowedType = (file: File) => {
    const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
    return (
      (AVATAR_MIME_TYPES as readonly string[]).includes(file.type) &&
      (AVATAR_EXTENSIONS as readonly string[]).includes(extension)
    )
  }

  return z
    .instanceof(File)
    .refine(hasAllowedType, { error: t('avatarType') })
    .refine((file) => file.size <= AVATAR_MAX_BYTES, { error: t('avatarSize', { max: AVATAR_MAX_MB }) })
}

export type ProfileValues = z.infer<ReturnType<typeof createProfileSchema>>
export type PasswordValues = z.infer<ReturnType<typeof createPasswordSchema>>
