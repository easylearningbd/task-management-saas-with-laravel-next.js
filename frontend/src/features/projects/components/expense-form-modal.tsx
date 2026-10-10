'use client'

import * as React from 'react'
import Link from 'next/link'
import { Controller, useForm, type FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { DateField, SelectField, TextareaField } from '@/components/shared/form-fields'
import { FormModal } from '@/components/shared/form-modal'
import { toast } from '@/components/ui/toast'
import { TextField } from '@/features/auth/components/text-field'
import { useAuthFormError } from '@/features/auth/components/use-auth-form-error'
import { useExpenseCategories } from '@/features/expense-categories/api'
import { useExpenseWrites } from '@/features/projects/api'
import {
  createExpenseSchema,
  EMPTY_EXPENSE_FORM,
  expenseToFormValues,
  toExpensePayload,
  type ExpenseFormValues,
} from '@/features/projects/schema'
import type { Expense } from '@/features/projects/types'

/* Add Expense / Edit Expense — the Add Expense screenshot: the 468px modal with a rule under the
   header, one column:
     Title* ("enter title") · Description (textarea) · Amount* ("enter amount", ≥ 0, 2 decimals)
     · Date* (mm/dd/yyyy) · Category* ("select category")
   Footer: Cancel · Save. Category lists this company's ACTIVE expense categories, A–Z (the
   server checks again); editing keeps the expense's own category even if it was deactivated
   since. With no active categories the select is disabled and points at Expense Categories.
   Saving refreshes the Expenses stat cards, the Expenses summary card and the Overview donut
   together (the project's cache). */

const FIELDS = ['title', 'description', 'amount', 'expense_date', 'expense_category_id'] as const satisfies ReadonlyArray<
  FieldPath<ExpenseFormValues>
>

export function ExpenseFormModal({
  open,
  onOpenChange,
  projectId,
  expense,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: number
  /** Edit this expense; null to add one. */
  expense: Expense | null
}) {
  const t = useTranslations('projects.expenses.form')
  const tValidation = useTranslations('projects.validation')
  const isEdit = expense !== null
  const { create, update } = useExpenseWrites(projectId)

  const categories = useExpenseCategories({ page: 1, per_page: 100, status: 'active', sort: 'name', direction: 'asc' })
  const options = React.useMemo(() => {
    const list = (categories.data?.data ?? []).map((category) => ({ value: String(category.id), label: category.name }))
    // Edit: the expense's own category stays selectable even if it was deactivated since.
    if (expense?.category && !list.some((option) => option.value === String(expense.expense_category_id))) {
      list.unshift({ value: String(expense.expense_category_id), label: expense.category.name })
    }
    return list
  }, [categories.data, expense])
  const noCategories = categories.isSuccess && options.length === 0

  const schema = React.useMemo(() => createExpenseSchema(tValidation), [tValidation])
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(schema),
    defaultValues: expense ? expenseToFormValues(expense) : EMPTY_EXPENSE_FORM,
  })
  const { formError, setFormError, handleError } = useAuthFormError(setError, FIELDS)

  const onSubmit = (values: ExpenseFormValues) => {
    setFormError(null)
    const payload = toExpensePayload(values)
    const done = {
      onSuccess: () => {
        toast.success(isEdit ? t('updated') : t('created'))
        onOpenChange(false)
      },
      onError: handleError,
    }
    if (expense) update.mutate({ id: expense.id, payload }, done)
    else create.mutate(payload, done)
  }

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? t('editTitle') : t('createTitle')}
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={t('save')}
      cancelLabel={t('cancel')}
      pending={create.isPending || update.isPending}
      dirty={isDirty}
      error={formError}
      size="sm"
      divided
    >
      <div className="flex flex-col gap-4.5">
        <TextField label={t('title')} placeholder={t('titlePlaceholder')} required autoComplete="off" error={errors.title?.message} {...register('title')} />
        <TextareaField label={t('description')} placeholder={t('descriptionPlaceholder')} error={errors.description?.message} {...register('description')} />
        <TextField
          label={t('amount')}
          placeholder={t('amountPlaceholder')}
          required
          inputMode="decimal"
          autoComplete="off"
          error={errors.amount?.message}
          {...register('amount')}
        />
        <DateField label={t('date')} required error={errors.expense_date?.message} {...register('expense_date')} />
        <div>
          <Controller
            control={control}
            name="expense_category_id"
            render={({ field, fieldState }) => (
              <SelectField
                label={t('category')}
                required
                value={field.value}
                onValueChange={field.onChange}
                triggerRef={field.ref}
                options={options}
                disabled={noCategories || categories.isPending}
                placeholder={categories.isPending ? t('categoriesLoading') : noCategories ? t('noCategories') : t('categoryPlaceholder')}
                error={fieldState.error?.message}
              />
            )}
          />
          {noCategories ? (
            <p className="mt-1.5 text-body-sm text-muted-foreground">
              {t.rich('noCategoriesHint', {
                link: (chunks) => (
                  <Link
                    href="/configuration/expense-categories"
                    className="font-medium text-primary underline-offset-4 hover:underline focus-visible:shadow-focus focus-visible:outline-none"
                  >
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          ) : null}
        </div>
      </div>
    </FormModal>
  )
}
