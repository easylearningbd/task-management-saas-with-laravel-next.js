'use client'

import * as React from 'react'
import { Controller, useForm, useWatch, type Control, type FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { FormModal } from '@/components/shared/form-modal'
import { DateInput } from '@/components/ui/date-input'
import { Field, FieldMessage } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioOption } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/components/ui/toast'
import { useAuthFormError } from '@/features/auth/components/use-auth-form-error'
import { useCreateCoupon, useGenerateCouponCode, useUpdateCoupon } from '@/features/coupons/api'
import {
  couponToFormValues,
  createCouponSchema,
  EMPTY_COUPON_FORM,
  formValuesToPayload,
  todayUtc,
  type CouponFormValues,
} from '@/features/coupons/schema'
import type { CodeMode, Coupon } from '@/features/coupons/types'

/* Add New Coupon / Edit Coupon — PAGE SPEC B and the Add New Coupon screenshot: an 872px modal
   (rule under the header) holding a two-column grid, one column on phones, in this order:
     Coupon Name*          | Discount Type*  (40px select, as measured)
     Discount Value*  % $  | Total Usage Limit
     Code Generation*  ◉ Manual Entry ○ Auto Generate | Coupon Code*
     Minimum Spend ($)     | Maximum Spend ($)
     Usage Limit Per User  | Expiry Date
   then Cancel + Save. Auto Generate fills the code from the API and locks the field; Manual
   Entry clears and unlocks it. The zod schema mirrors the backend; a 422 lands under its field
   (a duplicate code under Coupon Code) and anything else in the form alert. */

const FIELDS = [
  'name',
  'code_mode',
  'code',
  'type',
  'value',
  'min_spend',
  'max_spend',
  'usage_limit',
  'per_user_limit',
  'expiry_date',
] as const satisfies ReadonlyArray<FieldPath<CouponFormValues>>

export function CouponFormModal({
  open,
  onOpenChange,
  coupon,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Edit this coupon; omit to create. */
  coupon?: Coupon | null
}) {
  const t = useTranslations('coupons.form')
  const tValidation = useTranslations('coupons.validation')
  const tCommon = useTranslations('common')
  const isEdit = Boolean(coupon)
  const create = useCreateCoupon()
  const update = useUpdateCoupon(coupon?.id ?? 0)
  const mutation = isEdit ? update : create
  const generate = useGenerateCouponCode()
  const [generateFailed, setGenerateFailed] = React.useState(false)
  const codeRef = React.useRef<HTMLInputElement | null>(null)

  const today = React.useMemo(() => todayUtc(), [])
  const originalExpiry = coupon?.expiry_date ?? null
  const schema = React.useMemo(
    () => createCouponSchema(tValidation, { today, originalExpiry }),
    [tValidation, today, originalExpiry],
  )

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    getValues,
    clearErrors,
    trigger,
    formState: { errors, isDirty },
  } = useForm<CouponFormValues>({
    resolver: zodResolver(schema),
    defaultValues: coupon ? couponToFormValues(coupon) : EMPTY_COUPON_FORM,
  })
  const { formError, setFormError, handleError } = useAuthFormError(setError, FIELDS)

  const type = useWatch({ control, name: 'type' })
  const codeMode = useWatch({ control, name: 'code_mode' })
  const auto = codeMode === 'auto'

  const changeCodeMode = (mode: CodeMode) => {
    setValue('code_mode', mode, { shouldDirty: true })
    setValue('code', '', { shouldDirty: true })
    clearErrors('code')
    setGenerateFailed(false)

    if (mode === 'manual') {
      // Back to typing: the field unlocks empty and takes focus.
      requestAnimationFrame(() => codeRef.current?.focus())
      return
    }
    generate.mutate(undefined, {
      onSuccess: (code) => {
        // Ignore a late answer if the admin switched back to Manual meanwhile.
        if (getValues('code_mode') === 'auto') setValue('code', code, { shouldDirty: true })
      },
      // Not fatal: with Auto Generate and no code, the server generates one on save.
      onError: () => setGenerateFailed(true),
    })
  }

  const onSubmit = (values: CouponFormValues) => {
    setFormError(null)
    mutation.mutate(formValuesToPayload(values), {
      onSuccess: () => {
        toast.success(isEdit ? t('updated') : t('created'))
        onOpenChange(false) // straight to the parent: a saved form has nothing to discard
      },
      onError: handleError,
    })
  }

  const busy = mutation.isPending
  const minDate = originalExpiry !== null && originalExpiry < today ? originalExpiry : today

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? t('editTitle') : t('createTitle')}
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={t('save')}
      cancelLabel={t('cancel')}
      pending={busy}
      dirty={isDirty}
      error={formError}
      divided
    >
      <div className="grid grid-cols-1 gap-x-4 gap-y-3 md:grid-cols-2">
        <FormField id="coupon-name" label={t('name')} required error={errors.name?.message}>
          {(aria) => <Input placeholder={t('namePlaceholder')} autoComplete="off" {...aria} {...register('name')} />}
        </FormField>

        <FormField id="coupon-type" label={t('type')} required error={errors.type?.message}>
          {(aria) => (
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(value) => {
                    field.onChange(value)
                    field.onBlur()
                    // The ≤ 100 rule follows the type: re-check a value that is already in error.
                    if (errors.value) void trigger('value')
                  }}
                >
                  <SelectTrigger size="lg" ref={field.ref} onBlur={field.onBlur} {...aria}>
                    <SelectValue placeholder={t('typePlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">{t('percentage')}</SelectItem>
                    <SelectItem value="flat">{t('flat')}</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          )}
        </FormField>

        <FormField id="coupon-value" label={t('value')} required error={errors.value?.message}>
          {(aria) => (
            <Input
              inputMode="decimal"
              placeholder={t('valuePlaceholder')}
              affix={type === 'percentage' ? t('percentAffix') : type === 'flat' ? t('currencyAffix') : null}
              autoComplete="off"
              {...aria}
              {...register('value')}
            />
          )}
        </FormField>

        <FormField id="coupon-usage-limit" label={t('usageLimit')} error={errors.usage_limit?.message}>
          {(aria) => (
            <Input inputMode="numeric" placeholder={t('unlimitedPlaceholder')} autoComplete="off" {...aria} {...register('usage_limit')} />
          )}
        </FormField>

        <CodeModeField
          control={control}
          label={t('codeGeneration')}
          manualLabel={t('manual')}
          autoLabel={t('auto')}
          requiredLabel={tCommon('requiredField')}
          onChange={changeCodeMode}
          error={errors.code_mode?.message}
        />

        <FormField
          id="coupon-code"
          label={t('code')}
          required={!auto}
          error={errors.code?.message}
          hint={auto ? (generate.isPending ? t('generating') : generateFailed ? t('generateFailed') : undefined) : undefined}
        >
          {(aria) => {
            // Registered here, in form order, so a failed submit focuses Coupon Name first.
            const { ref: codeRegisterRef, ...codeRegistration } = register('code')
            return (
              <Input
                placeholder={t('codePlaceholder')}
                autoComplete="off"
                spellCheck={false}
                readOnly={auto}
                aria-readonly={auto || undefined}
                // Typed codes show uppercase (the placeholder doesn't); the payload uppercases for real.
                // Read-only (Auto Generate) wears the disabled ground but stays focusable and is submitted.
                className={auto ? 'bg-muted not-placeholder-shown:uppercase' : 'not-placeholder-shown:uppercase'}
                {...aria}
                {...codeRegistration}
                ref={(element) => {
                  codeRegisterRef(element)
                  codeRef.current = element
                }}
              />
            )
          }}
        </FormField>

        <FormField id="coupon-min-spend" label={t('minSpend')} error={errors.min_spend?.message}>
          {(aria) => <Input inputMode="decimal" placeholder={t('optional')} autoComplete="off" {...aria} {...register('min_spend')} />}
        </FormField>

        <FormField id="coupon-max-spend" label={t('maxSpend')} error={errors.max_spend?.message}>
          {(aria) => <Input inputMode="decimal" placeholder={t('optional')} autoComplete="off" {...aria} {...register('max_spend')} />}
        </FormField>

        <FormField id="coupon-per-user-limit" label={t('perUserLimit')} error={errors.per_user_limit?.message}>
          {(aria) => (
            <Input inputMode="numeric" placeholder={t('unlimitedPlaceholder')} autoComplete="off" {...aria} {...register('per_user_limit')} />
          )}
        </FormField>

        <FormField id="coupon-expiry" label={t('expiryDate')} error={errors.expiry_date?.message}>
          {(aria) => <DateInput min={minDate} {...aria} {...register('expiry_date')} />}
        </FormField>
      </div>
    </FormModal>
  )
}

type FieldAria = {
  id: string
  'aria-invalid'?: true
  'aria-describedby'?: string
  'aria-required'?: true
}

/** Label + control + helper/error, wired for accessibility (the error replaces the helper). */
function FormField({
  id,
  label,
  required = false,
  error,
  hint,
  children,
}: {
  id: string
  label: string
  required?: boolean
  error?: string
  hint?: string
  children: (aria: FieldAria) => React.ReactNode
}) {
  const t = useTranslations('common')
  const messageId = `${id}-message`
  const message = error ?? hint
  return (
    <Field>
      <Label htmlFor={id} required={required} requiredLabel={t('requiredField')}>
        {label}
      </Label>
      {children({
        id,
        'aria-invalid': error ? true : undefined,
        'aria-describedby': message ? messageId : undefined,
        'aria-required': required ? true : undefined,
      })}
      {message ? (
        <FieldMessage id={messageId} error={Boolean(error)}>
          {message}
        </FieldMessage>
      ) : null}
    </Field>
  )
}

/** "Code Generation": the Manual Entry / Auto Generate radio pair (Radio.md, inline). */
function CodeModeField({
  control,
  label,
  manualLabel,
  autoLabel,
  requiredLabel,
  onChange,
  error,
}: {
  control: Control<CouponFormValues>
  label: string
  manualLabel: string
  autoLabel: string
  requiredLabel: string
  onChange: (mode: CodeMode) => void
  error?: string
}) {
  const labelId = React.useId()
  return (
    <Field>
      <Label id={labelId} required requiredLabel={requiredLabel}>
        {label}
      </Label>
      <Controller
        control={control}
        name="code_mode"
        render={({ field }) => (
          <RadioGroup
            ref={field.ref}
            aria-labelledby={labelId}
            aria-required
            value={field.value}
            onValueChange={(value) => onChange(value as CodeMode)}
          >
            <RadioOption value="manual" label={manualLabel} />
            <RadioOption value="auto" label={autoLabel} />
          </RadioGroup>
        )}
      />
      {error ? <FieldMessage error>{error}</FieldMessage> : null}
    </Field>
  )
}
