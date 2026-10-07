import { z } from 'zod'
import type { useTranslations } from 'next-intl'
import {
  COMPANY_STATUSES,
  type Company,
  type CompanyStatus,
  type CreateCompanyPayload,
  type ResetCompanyPasswordPayload,
  type UpdateCompanyPayload,
} from '@/features/companies/types'

/* Mirrors backend StoreCompanyRequest / UpdateCompanyRequest / ResetCompanyPasswordRequest
   (and CompanyService):
   name                 required | max:255
   email                required | email | max:255 | unique across all users (server — its 422
                        lands under Email); trimmed + lowercased
   enable_login         boolean (off by default)
   password             create + login on: required | min:8 (Password::defaults()) | confirmed
                        create + login off: ignored (the account gets no usable password)
                        edit: optional — blank keeps the current one; if given, min:8 | confirmed
                        edit, turning login ON for a company that never had a password:
                        required ("Set one to enable login")
   status               edit only: active | inactive
   A mismatch is shown under Confirm Password (the server reports it under Password; both
   lead to the same fix). */

export const NAME_MAX = 255
export const EMAIL_MAX = 255
export const PASSWORD_MIN = 8

type ValidationT = ReturnType<typeof useTranslations<'companies.validation'>>

export type CompanySchemaOptions =
  | { mode: 'create' }
  | {
      mode: 'edit'
      /** From the details payload: whether a password was ever set. */
      hasPassword: boolean
      /** Login state before this edit. */
      wasLoginEnabled: boolean
    }

export function createCompanySchema(t: ValidationT, options: CompanySchemaOptions) {
  return z
    .object({
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
      status: z.enum(COMPANY_STATUSES),
      enable_login: z.boolean(),
      password: z.string(),
      password_confirmation: z.string(),
    })
    .superRefine((values, ctx) => {
      const issue = (path: 'password' | 'password_confirmation', message: string) =>
        ctx.addIssue({ code: 'custom', path: [path], message })

      const given = values.password !== ''
      const required =
        options.mode === 'create'
          ? values.enable_login
          : values.enable_login && !options.wasLoginEnabled && !options.hasPassword

      // Create with login off: the password is ignored entirely.
      if (options.mode === 'create' && !values.enable_login) return

      if (!given) {
        if (required) {
          issue('password', options.mode === 'create' ? t('passwordRequired') : t('passwordNeededToEnable'))
        }
        return
      }
      if (values.password.length < PASSWORD_MIN) {
        issue('password', t('passwordMin', { min: PASSWORD_MIN }))
        return
      }
      if (values.password_confirmation !== values.password) issue('password_confirmation', t('passwordMismatch'))
    })
}

export type CompanyFormValues = z.infer<ReturnType<typeof createCompanySchema>>

/** The Add New Company form: Enable Login off, nothing typed. */
export const EMPTY_COMPANY_FORM: CompanyFormValues = {
  name: '',
  email: '',
  status: 'active',
  enable_login: false,
  password: '',
  password_confirmation: '',
}

/** Edit prefill. Password fields always start blank (blank = keep the current one). */
export function companyToFormValues(company: Pick<Company, 'name' | 'email' | 'status' | 'is_login_enabled'>): CompanyFormValues {
  return {
    name: company.name,
    email: company.email,
    status: company.status,
    enable_login: company.is_login_enabled,
    password: '',
    password_confirmation: '',
  }
}

export function toCreatePayload(values: CompanyFormValues): CreateCompanyPayload {
  return {
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    enable_login: values.enable_login,
    ...(values.enable_login ? { password: values.password, password_confirmation: values.password_confirmation } : {}),
  }
}

export function toUpdatePayload(values: CompanyFormValues): UpdateCompanyPayload {
  return {
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    status: values.status as CompanyStatus,
    enable_login: values.enable_login,
    ...(values.password !== '' ? { password: values.password, password_confirmation: values.password_confirmation } : {}),
  }
}

/* ── Reset password ── */

export function createResetPasswordSchema(t: ValidationT) {
  return z
    .object({ password: z.string(), password_confirmation: z.string() })
    .superRefine((values, ctx) => {
      if (values.password === '') {
        ctx.addIssue({ code: 'custom', path: ['password'], message: t('newPasswordRequired') })
      } else if (values.password.length < PASSWORD_MIN) {
        ctx.addIssue({ code: 'custom', path: ['password'], message: t('passwordMin', { min: PASSWORD_MIN }) })
      } else if (values.password_confirmation !== values.password) {
        ctx.addIssue({ code: 'custom', path: ['password_confirmation'], message: t('passwordMismatch') })
      }
    })
}

export type ResetPasswordValues = z.infer<ReturnType<typeof createResetPasswordSchema>>

export const EMPTY_RESET_PASSWORD: ResetPasswordValues = { password: '', password_confirmation: '' }

export function toResetPayload(values: ResetPasswordValues): ResetCompanyPasswordPayload {
  return { password: values.password, password_confirmation: values.password_confirmation }
}

/**
 * The reset-password strength hint: 0 = empty … 4 = strong. Counts length ≥ 8, length ≥ 12,
 * mixed case, and a digit or symbol. Advisory only — the server's rule is min:8.
 */
export function passwordStrength(password: string): 0 | 1 | 2 | 3 | 4 {
  if (password === '') return 0
  let score = 0
  if (password.length >= PASSWORD_MIN) score++
  if (password.length >= 12) score++
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++
  if (/\d/.test(password) || /[^A-Za-z0-9]/.test(password)) score++
  return Math.max(1, score) as 1 | 2 | 3 | 4
}
