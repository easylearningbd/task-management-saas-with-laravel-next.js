'use client'

import * as React from 'react'
import { Controller, useForm, type FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { Alert } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardHeading } from '@/components/ui/card'
import { ColorPicker } from '@/components/ui/color-picker'
import { Field, FieldMessage } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/toast'
import { TextField } from '@/features/auth/components/text-field'
import { useAuthFormError } from '@/features/auth/components/use-auth-form-error'
import { useCreateExpenseCategory, useUpdateExpenseCategory } from '@/features/expense-categories/api'
import {
  createExpenseCategorySchema,
  DEFAULT_COLOR,
  EMPTY_EXPENSE_CATEGORY_FORM,
  expenseCategoryToFormValues,
  toExpenseCategoryPayload,
  type ExpenseCategoryFormValues,
} from '@/features/expense-categories/schema'
import type { ExpenseCategory } from '@/features/expense-categories/types'

/* The left card of the Expense Categories screenshot — the page's only form, used for both
   create and edit (no modal):
     header (rule beneath): "Add New Expense Category" / "Fill in the details to create a new
       expense category" — or, editing, "Edit Expense Category" / "Update the details of this
       expense category"
     Category Name* · Status (Active) · Description · Color (swatch + hex, #3B82F6)
     rule, then the full-width green "Add Category" — or, editing, Cancel + "Update Category".
   The page remounts this card (a new key) for every mode change, so each one starts from
   clean defaults. zod mirrors the server; a 422 lands under its field (a taken name under
   Category Name), anything else in the alert above the fields. Selects are `lg` (40px) and
   inputs `default` (36px), as measured on the screenshot; the description is ~80px tall, as
   in the plans form. */

const FIELDS = ['name', 'status', 'description', 'color'] as const satisfies ReadonlyArray<FieldPath<ExpenseCategoryFormValues>>

export function ExpenseCategoryFormCard({
  category,
  onSaved,
  onCancel,
  nameRef,
}: {
  /** Edit this category; null to create. */
  category: ExpenseCategory | null
  /** After a successful create or update (the page goes back to create mode). */
  onSaved: () => void
  /** Edit mode's Cancel. */
  onCancel: () => void
  /** The Category Name input, so the page can move focus into the form. */
  nameRef: React.RefObject<HTMLInputElement | null>
}) {
  const t = useTranslations('expenseCategories.form')
  const tValidation = useTranslations('expenseCategories.validation')
  const tCommon = useTranslations('common')
  const isEdit = category !== null
  const create = useCreateExpenseCategory()
  const update = useUpdateExpenseCategory(category?.id ?? 0)
  const pending = isEdit ? update.isPending : create.isPending

  const schema = React.useMemo(() => createExpenseCategorySchema(tValidation), [tValidation])
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors },
  } = useForm<ExpenseCategoryFormValues>({
    resolver: zodResolver(schema),
    defaultValues: category ? expenseCategoryToFormValues(category) : EMPTY_EXPENSE_CATEGORY_FORM,
  })
  const { formError, setFormError, handleError } = useAuthFormError(setError, FIELDS)

  // The lock icon can change the status of the category being edited: follow it, so Update
  // never puts the old status back. The other fields keep whatever is being typed.
  const savedStatus = category?.status
  React.useEffect(() => {
    if (savedStatus) setValue('status', savedStatus)
  }, [savedStatus, setValue])

  const onSubmit = (values: ExpenseCategoryFormValues) => {
    setFormError(null)
    const done = {
      onSuccess: () => {
        toast.success(isEdit ? t('updated') : t('created'))
        onSaved()
      },
      onError: handleError,
    }
    if (isEdit) update.mutate(toExpenseCategoryPayload(values), done)
    else create.mutate(toExpenseCategoryPayload(values), done)
  }

  const { ref: nameFieldRef, ...nameField } = register('name')
  const statusId = React.useId()
  const descriptionId = React.useId()
  const colorId = React.useId()

  return (
    <Card>
      <CardHeading divided title={isEdit ? t('editTitle') : t('createTitle')} subtitle={isEdit ? t('editSubtitle') : t('createSubtitle')} />

      <form noValidate onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4.5 p-card">
        {formError ? <Alert tone="danger">{formError}</Alert> : null}

        <TextField
          label={t('name')}
          placeholder={t('namePlaceholder')}
          required
          autoComplete="off"
          error={errors.name?.message}
          ref={(element) => {
            nameFieldRef(element)
            nameRef.current = element
          }}
          {...nameField}
        />

        <Controller
          control={control}
          name="status"
          render={({ field, fieldState }) => (
            <Field>
              <Label htmlFor={statusId}>{t('status')}</Label>
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id={statusId}
                  ref={field.ref}
                  size="lg"
                  aria-invalid={fieldState.error ? true : undefined}
                  aria-describedby={fieldState.error ? `${statusId}-message` : undefined}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">{t('active')}</SelectItem>
                  <SelectItem value="inactive">{t('inactive')}</SelectItem>
                </SelectContent>
              </Select>
              {fieldState.error ? (
                <FieldMessage id={`${statusId}-message`} error>
                  {fieldState.error.message}
                </FieldMessage>
              ) : null}
            </Field>
          )}
        />

        <Field>
          <Label htmlFor={descriptionId}>{t('description')}</Label>
          <Textarea
            id={descriptionId}
            placeholder={t('descriptionPlaceholder')}
            className="min-h-20"
            aria-invalid={errors.description ? true : undefined}
            aria-describedby={errors.description ? `${descriptionId}-message` : undefined}
            {...register('description')}
          />
          {errors.description ? (
            <FieldMessage id={`${descriptionId}-message`} error>
              {errors.description.message}
            </FieldMessage>
          ) : null}
        </Field>

        <Controller
          control={control}
          name="color"
          render={({ field, fieldState }) => (
            <Field>
              <Label htmlFor={colorId} required requiredLabel={tCommon('requiredField')}>
                {t('color')}
              </Label>
              <ColorPicker
                id={colorId}
                name={field.name}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                inputRef={field.ref}
                swatchLabel={t('colorPicker')}
                fallback={DEFAULT_COLOR}
                invalid={Boolean(fieldState.error)}
                describedBy={fieldState.error ? `${colorId}-message` : undefined}
                required
              />
              {fieldState.error ? (
                <FieldMessage id={`${colorId}-message`} error>
                  {fieldState.error.message}
                </FieldMessage>
              ) : null}
            </Field>
          )}
        />

        <div className="flex gap-3 border-t border-border pt-4">
          {isEdit ? (
            <Button variant="outline" className="flex-1" onClick={onCancel} disabled={pending}>
              {t('cancel')}
            </Button>
          ) : null}
          <Button type="submit" className="flex-1" loading={pending}>
            {isEdit ? t('update') : t('add')}
          </Button>
        </div>
      </form>
    </Card>
  )
}
