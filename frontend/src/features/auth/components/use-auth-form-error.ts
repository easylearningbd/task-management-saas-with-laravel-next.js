'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import type { FieldValues, Path, UseFormSetError } from 'react-hook-form'
import { applyFieldErrors, toApiError } from '@/lib/api-error'

/**
 * Routes an auth request failure to the right place:
 * - 422 → under the matching fields (anything unmatched falls back to the form alert);
 * - 403 / 409 / 429 → the form-level alert, with the backend's message
 *   ("Your account is disabled…", "Too many login attempts…");
 * - no response → "Can't reach the server"; anything else → a generic message.
 */
export function useAuthFormError<T extends FieldValues>(
  setError: UseFormSetError<T>,
  fields: ReadonlyArray<Path<T>>,
) {
  const t = useTranslations('auth.errors')
  const [formError, setFormError] = React.useState<string | null>(null)

  const handleError = React.useCallback(
    (error: unknown) => {
      const apiError = toApiError(error)

      if (apiError.status === 422 && applyFieldErrors(apiError, setError, fields)) {
        setFormError(null)
        return
      }

      if (apiError.status === 0) {
        setFormError(t('network'))
      } else if ([403, 409, 422, 429].includes(apiError.status) && apiError.message) {
        setFormError(apiError.message)
      } else {
        setFormError(t('generic'))
      }
    },
    [fields, setError, t],
  )

  return { formError, setFormError, handleError }
}
