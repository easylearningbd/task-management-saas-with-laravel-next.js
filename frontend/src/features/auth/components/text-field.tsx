'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Field, FieldMessage } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/* Label + Input + helper/error, wired for accessibility: the error replaces the helper,
   `aria-invalid` carries the state and `aria-describedby` points at whichever is shown. */
export function TextField({
  label,
  error,
  hint,
  required = false,
  labelAction,
  id: idProp,
  ...inputProps
}: React.ComponentProps<typeof Input> & {
  /** Usually a string; a node allows inline parts such as a muted "(Optional)". */
  label: React.ReactNode
  error?: string
  hint?: string
  required?: boolean
  /** Rendered at the right of the label row, e.g. "Forgot password?". */
  labelAction?: React.ReactNode
}) {
  const t = useTranslations('common')
  const generatedId = React.useId()
  const id = idProp ?? generatedId
  const messageId = `${id}-message`
  const message = error ?? hint

  return (
    <Field>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id} required={required} requiredLabel={t('requiredField')}>
          {label}
        </Label>
        {labelAction}
      </div>
      <Input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        aria-required={required || undefined}
        {...inputProps}
      />
      {message ? (
        <FieldMessage id={messageId} error={Boolean(error)}>
          {message}
        </FieldMessage>
      ) : null}
    </Field>
  )
}
