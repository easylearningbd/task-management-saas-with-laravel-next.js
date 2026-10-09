'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Field, FieldMessage } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

/* Labelled form controls wired like TextField (features/auth/components/text-field.tsx): the
   label (with the `destructive` asterisk and its screen-reader word when required), the
   control, then the error — or a hint — beneath it; `aria-invalid` carries the state and
   `aria-describedby` points at whichever message is shown. Generic: no module wording here. */

type MessageProps = { error?: string; hint?: string }

function useMessage(id: string, { error, hint }: MessageProps) {
  const message = error ?? hint
  const messageId = `${id}-message`
  return {
    describedBy: message ? messageId : undefined,
    node: message ? (
      <FieldMessage id={messageId} error={Boolean(error)}>
        {message}
      </FieldMessage>
    ) : null,
  }
}

/** Label + Textarea + message. Spread a react-hook-form `register()` result onto it. */
export function TextareaField({
  label,
  required = false,
  error,
  hint,
  id: idProp,
  ...textareaProps
}: React.ComponentProps<typeof Textarea> & { label: string; required?: boolean } & MessageProps) {
  const tCommon = useTranslations('common')
  const generatedId = React.useId()
  const id = idProp ?? generatedId
  const message = useMessage(id, { error, hint })

  return (
    <Field>
      <Label htmlFor={id} required={required} requiredLabel={tCommon('requiredField')}>
        {label}
      </Label>
      <Textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={message.describedBy}
        aria-required={required || undefined}
        {...textareaProps}
      />
      {message.node}
    </Field>
  )
}

/** Label + the design-system Select (a fixed list of options) + message. */
export function SelectField<V extends string>({
  label,
  value,
  onValueChange,
  options,
  triggerRef,
  required = false,
  disabled = false,
  error,
  hint,
  size,
}: {
  label: string
  value: V
  onValueChange: (value: V) => void
  options: ReadonlyArray<{ value: V; label: string }>
  triggerRef?: React.Ref<HTMLButtonElement>
  required?: boolean
  disabled?: boolean
  size?: 'default' | 'lg'
} & MessageProps) {
  const tCommon = useTranslations('common')
  const id = React.useId()
  const message = useMessage(id, { error, hint })

  return (
    <Field>
      <Label htmlFor={id} required={required} requiredLabel={tCommon('requiredField')}>
        {label}
      </Label>
      <Select value={value} onValueChange={(next) => onValueChange(next as V)} disabled={disabled}>
        <SelectTrigger id={id} ref={triggerRef} size={size} aria-invalid={error ? true : undefined} aria-describedby={message.describedBy}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {message.node}
    </Field>
  )
}
