'use client'

import * as React from 'react'
import { Controller, useForm, useWatch, type FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { FormModal } from '@/components/shared/form-modal'
import { SelectField, TextareaField } from '@/components/shared/form-fields'
import { Checkbox } from '@/components/ui/checkbox'
import { ColorPicker } from '@/components/ui/color-picker'
import { Field, FieldMessage } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { toast } from '@/components/ui/toast'
import { TextField } from '@/features/auth/components/text-field'
import { useAuthFormError } from '@/features/auth/components/use-auth-form-error'
import { useCreateTaskStage, useTaskStageStats, useUpdateTaskStage } from '@/features/task-stages/api'
import {
  createTaskStageSchema,
  DEFAULT_COLOR,
  EMPTY_TASK_STAGE_FORM,
  taskStageToFormValues,
  toTaskStagePayload,
  type TaskStageFormValues,
} from '@/features/task-stages/schema'
import type { TaskStage, TaskStageStatus } from '@/features/task-stages/types'
import { cn } from '@/lib/cn'

/* Add New Task Stage / Edit Task Stage — PAGE SPEC B and the Add New Task Stage screenshot: the
   468px modal with a rule under the header, one column, in this order:
     Stage Name* · Description · Color (swatch + hex, #3B82F6 — the shared ColorPicker) ·
     Order ("enter order"; empty = at the end) · Status (Active) · ☐ Mark as Done Stage
   Footer: Cancel (outline) · Save (green).
   - Mark as Done Stage is the design system's Checkbox (applies on Save — Checkbox.md; Phase 0
     decision 2), label to its right. Like the admin Default Plan switch: turning it on warns
     that the done flag leaves the current done stage (named) and sets Status to Active (a done
     stage is always active, so Status is locked while it is on); on the current done stage it
     is checked and locked, with a muted hint — it can only move by marking another stage.
   - zod mirrors the server; a 422 lands under its field, and the workflow refusals (`stage` —
     e.g. this stage became the done stage elsewhere and the form would unset it) show in the
     alert above the fields. FormModal owns focus and the unsaved-changes confirm. */

const FIELDS = ['name', 'description', 'color', 'order', 'status', 'is_done_stage'] as const satisfies ReadonlyArray<
  FieldPath<TaskStageFormValues>
>

export function TaskStageFormModal({
  open,
  onOpenChange,
  stage,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Edit this stage; null to create. */
  stage: TaskStage | null
}) {
  const t = useTranslations('taskStages.form')
  const tValidation = useTranslations('taskStages.validation')
  const isEdit = stage !== null
  const create = useCreateTaskStage()
  const update = useUpdateTaskStage(stage?.id ?? 0)
  const pending = isEdit ? update.isPending : create.isPending
  const stats = useTaskStageStats()
  const currentDone = stats.data?.done_stage ?? null

  const schema = React.useMemo(() => createTaskStageSchema(tValidation), [tValidation])
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isDirty },
  } = useForm<TaskStageFormValues>({
    resolver: zodResolver(schema),
    defaultValues: stage ? taskStageToFormValues(stage) : EMPTY_TASK_STAGE_FORM,
  })
  const { formError, setFormError, handleError } = useAuthFormError(setError, FIELDS)

  const isDone = useWatch({ control, name: 'is_done_stage' })
  /** The current done stage can't be un-done here — another stage has to take over. */
  const lockedDone = isEdit && stage.is_done_stage
  const takesOver = isDone && !lockedDone

  const onSubmit = (values: TaskStageFormValues) => {
    setFormError(null)
    const done = {
      onSuccess: () => {
        toast.success(isEdit ? t('updated') : t('created'))
        onOpenChange(false) // straight to the parent: a saved form has nothing to discard
      },
      onError: handleError,
    }
    if (isEdit) update.mutate(toTaskStagePayload(values), done)
    else create.mutate(toTaskStagePayload(values), done)
  }

  const doneId = React.useId()
  const doneHint = lockedDone
    ? t('doneLocked')
    : takesOver
      ? currentDone && currentDone.id !== stage?.id
        ? t('doneWarning', { name: currentDone.name })
        : t('doneWarningNone')
      : null

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
          label={t('name')}
          placeholder={t('namePlaceholder')}
          required
          autoComplete="off"
          error={errors.name?.message}
          {...register('name')}
        />

        <TextareaField label={t('description')} placeholder={t('descriptionPlaceholder')} error={errors.description?.message} {...register('description')} />

        <Controller
          control={control}
          name="color"
          render={({ field, fieldState }) => (
            <ColorField
              label={t('color')}
              swatchLabel={t('colorPicker')}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              inputRef={field.ref}
              error={fieldState.error?.message}
            />
          )}
        />

        <TextField
          label={t('order')}
          placeholder={t('orderPlaceholder')}
          inputMode="numeric"
          autoComplete="off"
          error={errors.order?.message}
          {...register('order')}
        />

        <Controller
          control={control}
          name="status"
          render={({ field, fieldState }) => (
            <SelectField<TaskStageStatus>
              label={t('status')}
              value={field.value}
              onValueChange={field.onChange}
              triggerRef={field.ref}
              size="lg"
              disabled={isDone} // a done stage is always active
              hint={isDone ? t('statusLocked') : undefined}
              error={fieldState.error?.message}
              options={[
                { value: 'active', label: t('active') },
                { value: 'inactive', label: t('inactive') },
              ]}
            />
          )}
        />

        <Controller
          control={control}
          name="is_done_stage"
          render={({ field }) => (
            <div>
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id={doneId}
                  ref={field.ref}
                  checked={field.value}
                  disabled={lockedDone}
                  aria-describedby={doneHint ? `${doneId}-hint` : undefined}
                  onCheckedChange={(checked) => {
                    const on = checked === true
                    field.onChange(on)
                    if (on) setValue('status', 'active', { shouldDirty: true })
                  }}
                />
                <Label htmlFor={doneId} className={cn(lockedDone && 'text-muted-foreground')}>
                  {t('isDone')}
                </Label>
              </div>
              {doneHint ? (
                <p id={`${doneId}-hint`} className={cn('mt-1.5 text-caption font-normal', takesOver ? 'text-warning' : 'text-muted-foreground')}>
                  {doneHint}
                </p>
              ) : null}
            </div>
          )}
        />
      </div>
    </FormModal>
  )
}

/** Label + the shared ColorPicker + its message. */
function ColorField({
  label,
  swatchLabel,
  value,
  onChange,
  onBlur,
  inputRef,
  error,
}: {
  label: string
  swatchLabel: string
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  inputRef: React.Ref<HTMLInputElement>
  error?: string
}) {
  const id = React.useId()
  return (
    <Field>
      <Label htmlFor={id}>{label}</Label>
      <ColorPicker
        id={id}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        inputRef={inputRef}
        swatchLabel={swatchLabel}
        fallback={DEFAULT_COLOR}
        invalid={Boolean(error)}
        describedBy={error ? `${id}-message` : undefined}
        required
      />
      {error ? (
        <FieldMessage id={`${id}-message`} error>
          {error}
        </FieldMessage>
      ) : null}
    </Field>
  )
}
