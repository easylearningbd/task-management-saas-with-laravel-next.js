import { z } from 'zod'
import type { useTranslations } from 'next-intl'
import { CLIENT_STATUSES, type Client, type ClientPayload } from '@/features/clients/types'

/* Mirrors backend StoreClientRequest / UpdateClientRequest (messages too — en.json
   clients.validation carries the same wording):
   name          required | max:255
   email         required | email | max:255 | unique within the company (server — its 422 lands
                 under Email); trimmed + lowercased
   phone         required | max:50
   company_name  required | max:255
   address       required | max:1000
   website       optional | http(s) URL | max:255   ("" → null)
   status        active | inactive (default active)
   notes         optional | max:5000                ("" → null)
   Every text is trimmed first, as the server does. */

export const NAME_MAX = 255
export const EMAIL_MAX = 255
export const PHONE_MAX = 50
export const COMPANY_MAX = 255
export const ADDRESS_MAX = 1000
export const WEBSITE_MAX = 255
export const NOTES_MAX = 5000

type ValidationT = ReturnType<typeof useTranslations<'clients.validation'>>

/**
 * Laravel's `url:http,https` as observed (Phase 5 parity check): an http or https scheme (any
 * case), a non-empty host without spaces or "..", an optional port, then anything without
 * spaces. Hosts need no dot (`https://localhost` passes), exactly like the server.
 */
const HTTP_URL = /^https?:\/\/([^\s/?#:]+)(?::\d+)?(?:[/?#]\S*)?$/i

export function isHttpUrl(value: string): boolean {
  const match = HTTP_URL.exec(value)
  return match !== null && !match[1].includes('..')
}

export function createClientSchema(t: ValidationT) {
  const required = (key: Parameters<ValidationT>[0], max: number, maxKey: Parameters<ValidationT>[0]) =>
    z
      .string()
      .trim()
      .min(1, { error: t(key) })
      .max(max, { error: t(maxKey, { max }) })

  return z.object({
    name: required('nameRequired', NAME_MAX, 'nameMax'),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, { error: t('emailRequired') })
      .max(EMAIL_MAX, { error: t('emailMax', { max: EMAIL_MAX }) })
      .pipe(z.email({ error: t('emailInvalid') })),
    phone: required('phoneRequired', PHONE_MAX, 'phoneMax'),
    company_name: required('companyRequired', COMPANY_MAX, 'companyMax'),
    address: required('addressRequired', ADDRESS_MAX, 'addressMax'),
    website: z
      .string()
      .trim()
      .max(WEBSITE_MAX, { error: t('websiteMax', { max: WEBSITE_MAX }) })
      .refine((value) => value === '' || isHttpUrl(value), { error: t('websiteInvalid') }),
    status: z.enum(CLIENT_STATUSES),
    notes: z
      .string()
      .trim()
      .max(NOTES_MAX, { error: t('notesMax', { max: NOTES_MAX }) }),
  })
}

export type ClientFormValues = z.infer<ReturnType<typeof createClientSchema>>

export const EMPTY_CLIENT_FORM: ClientFormValues = {
  name: '',
  email: '',
  phone: '',
  company_name: '',
  address: '',
  website: '',
  status: 'active',
  notes: '',
}

/** Edit prefill: nulls become empty fields. */
export function clientToFormValues(client: Client): ClientFormValues {
  return {
    name: client.name,
    email: client.email,
    phone: client.phone,
    company_name: client.company_name,
    address: client.address,
    website: client.website ?? '',
    status: client.status,
    notes: client.notes ?? '',
  }
}

/** The request body for create and update — empty optionals are sent as null. */
export function toClientPayload(values: ClientFormValues): ClientPayload {
  const website = values.website.trim()
  const notes = values.notes.trim()
  return {
    name: values.name.trim(),
    email: values.email.trim().toLowerCase(),
    phone: values.phone.trim(),
    company_name: values.company_name.trim(),
    address: values.address.trim(),
    website: website === '' ? null : website,
    status: values.status,
    notes: notes === '' ? null : notes,
  }
}
