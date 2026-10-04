import { z } from 'zod'
import type { useTranslations } from 'next-intl'

/* Mirrors backend validation:
   - LoginRequest:    email required|email, password required, remember boolean
   - RegisterRequest: name required|max:255, email required|email|max:255|unique,
                      password required|confirmed|Password::defaults() (min 8)
   `unique` and the credential check stay server-side; their 422s land under the field. */

export const NAME_MAX = 255
export const EMAIL_MAX = 255
export const PASSWORD_MIN = 8

type ValidationT = ReturnType<typeof useTranslations<'auth.validation'>>

const email = (t: ValidationT) =>
  z
    .string()
    .trim()
    .min(1, { error: t('emailRequired') })
    .max(EMAIL_MAX, { error: t('emailMax', { max: EMAIL_MAX }) })
    .pipe(z.email({ error: t('emailInvalid') }))

export function createLoginSchema(t: ValidationT) {
  return z.object({
    email: email(t),
    password: z.string().min(1, { error: t('passwordRequired') }),
    remember: z.boolean(),
  })
}

export function createRegisterSchema(t: ValidationT) {
  return z
    .object({
      name: z
        .string()
        .trim()
        .min(1, { error: t('nameRequired') })
        .max(NAME_MAX, { error: t('nameMax', { max: NAME_MAX }) }),
      email: email(t),
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
}

export type LoginValues = z.infer<ReturnType<typeof createLoginSchema>>
export type RegisterValues = z.infer<ReturnType<typeof createRegisterSchema>>
