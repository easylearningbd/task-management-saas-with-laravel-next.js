'use client'

import * as React from 'react'
import { Controller, useForm, type FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { DateField, SelectField, TextareaField } from '@/components/shared/form-fields'
import { FormModal } from '@/components/shared/form-modal'
import { toast } from '@/components/ui/toast'
import { TextField } from '@/features/auth/components/text-field'
import { useAuthFormError } from '@/features/auth/components/use-auth-form-error'
import { useMilestoneWrites } from '@/features/projects/api'
import {
  createMilestoneSchema,
  EMPTY_MILESTONE_FORM,
  milestoneToFormValues,
  toMilestonePayload,
  type MilestoneFormValues,
} from '@/features/projects/schema'
import { MILESTONE_STATUSES, type Milestone } from '@/features/projects/types'

/* Add Milestone / Edit Milestone — the 468px modal with a rule under the header, one column, in
   the screenshot's order (Phase 0 decision 7: no Start Date field):
     Title* · Description · Due Date* · Progress (0–100) · Status (Pending by default)
   Footer: Cancel · Save. zod mirrors StoreMilestoneRequest; a 422 lands under its field,
   anything else in the alert. Saving refreshes the tab, the Milestones card, the tab count and
   the Overview's figures together (the project's cache). */

const FIELDS = ['title', 'description', 'due_date', 'progress', 'status'] as const satisfies ReadonlyArray<FieldPath<MilestoneFormValues>>

export function MilestoneFormModal({
  open,
  onOpenChange,
  projectId,
  milestone,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: number
  /** Edit this milestone; null to add one. */
  milestone: Milestone | null
}) {
  const t = useTranslations('projects.milestones.form')
  const tValidation = useTranslations('projects.validation')
  const tStatus = useTranslations('projects.milestones.status')
  const isEdit = milestone !== null
  const { create, update } = useMilestoneWrites(projectId)
  const pending = create.isPending || update.isPending

  const schema = React.useMemo(() => createMilestoneSchema(tValidation), [tValidation])
  const {
    register,
    control,
    handleSubmit,
    setError,
    formState: { errors, isDirty },
  } = useForm<MilestoneFormValues>({
    resolver: zodResolver(schema),
    defaultValues: milestone ? milestoneToFormValues(milestone) : EMPTY_MILESTONE_FORM,
  })
  const { formError, setFormError, handleError } = useAuthFormError(setError, FIELDS)

  const onSubmit = (values: MilestoneFormValues) => {
    setFormError(null)
    const payload = toMilestonePayload(values)
    const done = {
      onSuccess: () => {
        toast.success(isEdit ? t('updated') : t('created'))
        onOpenChange(false)
      },
      onError: handleError,
    }
    if (milestone) update.mutate({ id: milestone.id, payload }, done)
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
      pending={pending}
      dirty={isDirty}
      error={formError}
      size="sm"
      divided
    >
      <div className="flex flex-col gap-4.5">
        <TextField
          label={t('title')}
          placeholder={t('titlePlaceholder')}
          required
          autoComplete="off"
          error={errors.title?.message}
          {...register('title')}
        />
        <TextareaField
          label={t('description')}
          placeholder={t('descriptionPlaceholder')}
          error={errors.description?.message}
          {...register('description')}
        />
        <DateField label={t('dueDate')} required error={errors.due_date?.message} {...register('due_date')} />
        <TextField
          label={t('progress')}
          placeholder={t('progressPlaceholder')}
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          step={1}
          hint={t('progressHint')}
          error={errors.progress?.message}
          {...register('progress')}
        />
        <Controller
          control={control}
          name="status"
          render={({ field, fieldState }) => (
            <SelectField
              label={t('status')}
              value={field.value}
              onValueChange={field.onChange}
              triggerRef={field.ref}
              error={fieldState.error?.message}
              options={MILESTONE_STATUSES.map((value) => ({ value, label: tStatus(value) }))}
            />
          )}
        />
      </div>
    </FormModal>
  )
}
