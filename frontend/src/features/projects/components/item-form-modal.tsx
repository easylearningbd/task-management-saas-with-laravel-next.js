'use client'

import * as React from 'react'
import { Controller, useForm, type FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { SelectField, TextareaField } from '@/components/shared/form-fields'
import { FormModal } from '@/components/shared/form-modal'
import { toast } from '@/components/ui/toast'
import { TextField } from '@/features/auth/components/text-field'
import { useAuthFormError } from '@/features/auth/components/use-auth-form-error'
import { useProjectItemWrites } from '@/features/projects/api'
import { createItemSchema, EMPTY_ITEM_FORM, itemToFormValues, toItemPayload, type ItemFormValues } from '@/features/projects/schema'
import { PROJECT_ITEM_UNITS, type ProjectItem } from '@/features/projects/types'

/* Add Item / Edit Item — the Add Item screenshot: the 468px modal with a rule under the header,
   one column:
     Item Name* ("enter item name") · Description (textarea) · Default Price* ("enter default
     price", ≥ 0, 2 decimals) · Unit* ("select unit": hours, package, piece, day, month, fixed —
     Phase 0 decision 8)
   Footer: Cancel · Save. The item belongs to this project (company and project come from the
   route, never the form). zod mirrors StoreProjectItemRequest; a 422 lands under its field. */

const FIELDS = ['name', 'description', 'default_price', 'unit'] as const satisfies ReadonlyArray<FieldPath<ItemFormValues>>

export function ItemFormModal({
  open,
  onOpenChange,
  projectId,
  item,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: number
  /** Edit this item; null to add one. */
  item: ProjectItem | null
}) {
  const t = useTranslations('projects.items.form')
  const tUnit = useTranslations('projects.items.units')
  const tValidation = useTranslations('projects.validation')
  const isEdit = item !== null
  const { create, update } = useProjectItemWrites(projectId)

  const schema = React.useMemo(() => createItemSchema(tValidation), [tValidation])
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<ItemFormValues>({
    resolver: zodResolver(schema),
    defaultValues: item ? itemToFormValues(item) : EMPTY_ITEM_FORM,
  })
  const { formError, setFormError, handleError } = useAuthFormError(setError, FIELDS)

  const onSubmit = (values: ItemFormValues) => {
    setFormError(null)
    const payload = toItemPayload(values)
    const done = {
      onSuccess: () => {
        toast.success(isEdit ? t('updated') : t('created'))
        onOpenChange(false)
      },
      onError: handleError,
    }
    if (item) update.mutate({ id: item.id, payload }, done)
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
        <TextField label={t('name')} placeholder={t('namePlaceholder')} required autoComplete="off" error={errors.name?.message} {...register('name')} />
        <TextareaField label={t('description')} placeholder={t('descriptionPlaceholder')} error={errors.description?.message} {...register('description')} />
        <TextField
          label={t('price')}
          placeholder={t('pricePlaceholder')}
          required
          inputMode="decimal"
          autoComplete="off"
          error={errors.default_price?.message}
          {...register('default_price')}
        />
        <Controller
          control={control}
          name="unit"
          render={({ field, fieldState }) => (
            <SelectField
              label={t('unit')}
              required
              placeholder={t('unitPlaceholder')}
              value={field.value as (typeof PROJECT_ITEM_UNITS)[number] | ''}
              onValueChange={field.onChange}
              triggerRef={field.ref}
              error={fieldState.error?.message}
              options={PROJECT_ITEM_UNITS.map((value) => ({ value, label: tUnit(value) }))}
            />
          )}
        />
      </div>
    </FormModal>
  )
}
