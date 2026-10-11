'use client'

import * as React from 'react'
import Link from 'next/link'
import { Controller, useForm, useWatch, type FieldPath } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslations } from 'next-intl'
import { DateField, SelectField, TextareaField } from '@/components/shared/form-fields'
import { FormModal } from '@/components/shared/form-modal'
import { toast } from '@/components/ui/toast'
import { TextField } from '@/features/auth/components/text-field'
import { useAuthFormError } from '@/features/auth/components/use-auth-form-error'
import { useMilestones, useProjects } from '@/features/projects/api'
import { useTaskStages } from '@/features/task-stages/api'
import { useCreateTask, useUpdateTask } from '@/features/tasks/api'
import { createTaskSchema, emptyTaskForm, taskToFormValues, toTaskPayload, type TaskFormValues } from '@/features/tasks/schema'
import { TASK_PRIORITIES, type Task } from '@/features/tasks/types'

/* Add New Task / Edit Task — PAGE SPEC B and the Add New Task screenshot: the 468px modal with a
   rule under the header, one column, in this order:
     Task Title* · Description · Project* · Milestone · Stage* · Start Date* · Due Date* ·
     Priority · Progress (%)
   Footer: Cancel (outline) · Save (green). Priority defaults to Medium; Progress starts empty
   ("enter progress") and is saved as 0.
   - Project lists this company's projects, A–Z (up to 100, as the filter). With none, the select
     is disabled and points at /projects.
   - Milestone is optional (no asterisk): "Select Milestone (Optional)", disabled until a project
     is chosen, listing only that project's milestones, cleared whenever the project changes;
     "No milestone" takes a chosen one off again. The server re-checks the pairing (422 under
     Milestone).
   - Stage lists the company's ACTIVE stages in board order; editing keeps the task's own stage
     even if it was deactivated since (the server allows it). In the done stage the server keeps
     the progress at 100% — a hint under Progress says so.
   - Due Date can't be before Start Date (its picker starts there too).
   - zod mirrors the server; a 422 lands under its field, anything else in the alert above the
     fields. Saving refreshes the board, the list, the stats, the stage counts and the affected
     projects' figures (features/tasks/api.ts).
   FormModal owns focus (first field on open, back to the trigger on close), Escape / × and the
   unsaved-changes confirm. */

const FIELDS = [
  'title',
  'description',
  'project_id',
  'milestone_id',
  'task_stage_id',
  'start_date',
  'due_date',
  'priority',
  'progress',
] as const satisfies ReadonlyArray<FieldPath<TaskFormValues>>

/** Radix Select forbids "" as an item value: "No milestone" rides on this and maps to ''. */
const NO_MILESTONE = 'none'

export function TaskFormModal({
  open,
  onOpenChange,
  task,
  defaults,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Edit this task; null to create. */
  task: Task | null
  /** Create: pre-select a project / stage (the page's current filters). */
  defaults?: Partial<Pick<TaskFormValues, 'project_id' | 'task_stage_id'>>
}) {
  const t = useTranslations('tasks.form')
  const tValidation = useTranslations('tasks.validation')
  const tPriority = useTranslations('tasks.priority')
  const isEdit = task !== null
  const create = useCreateTask()
  const update = useUpdateTask(task?.id ?? 0)
  const mutation = isEdit ? update : create

  const schema = React.useMemo(() => createTaskSchema(tValidation), [tValidation])
  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isDirty },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(schema),
    defaultValues: task ? taskToFormValues(task) : emptyTaskForm(defaults),
  })
  const projectId = useWatch({ control, name: 'project_id' })
  const stageId = useWatch({ control, name: 'task_stage_id' })
  const startDate = useWatch({ control, name: 'start_date' })
  const { formError, setFormError, handleError } = useAuthFormError(setError, FIELDS)

  /* ── Options ── */

  const projects = useProjects({ page: 1, per_page: 100, sort: 'name', direction: 'asc' })
  const projectOptions = React.useMemo(() => {
    const options = (projects.data?.data ?? []).map((project) => ({ value: String(project.id), label: project.name }))
    if (task?.project && !options.some((option) => option.value === String(task.project_id))) {
      options.unshift({ value: String(task.project_id), label: task.project.name })
    }
    return options
  }, [projects.data, task])
  const noProjects = projects.isSuccess && projectOptions.length === 0

  const hasProject = /^[1-9]\d*$/.test(projectId)
  const milestones = useMilestones(hasProject ? Number(projectId) : null)
  const milestoneOptions = React.useMemo(() => {
    const options = (milestones.data ?? []).map((milestone) => ({ value: String(milestone.id), label: milestone.title }))
    return options.length > 0 ? [{ value: NO_MILESTONE, label: t('noMilestone') }, ...options] : options
  }, [milestones.data, t])

  const stages = useTaskStages({ status: 'active' })
  const stageOptions = React.useMemo(() => {
    const options = (stages.data ?? []).map((stage) => ({ value: String(stage.id), label: stage.name }))
    // Edit: the task's own stage stays selectable even if it was deactivated since.
    if (task && !options.some((option) => option.value === String(task.task_stage_id))) {
      options.push({ value: String(task.task_stage_id), label: task.stage.name })
    }
    return options
  }, [stages.data, task])
  const doneStageSelected =
    (stages.data ?? []).some((stage) => String(stage.id) === stageId && stage.is_done_stage) ||
    (task !== null && String(task.task_stage_id) === stageId && task.stage.is_done_stage)

  /* ── Submit ── */

  const onSubmit = (values: TaskFormValues) => {
    setFormError(null)
    const done = {
      onSuccess: () => {
        toast.success(isEdit ? t('updated') : t('created'))
        onOpenChange(false) // straight to the parent: a saved form has nothing to discard
      },
      onError: handleError,
    }
    if (isEdit) update.mutate(toTaskPayload(values), done)
    else create.mutate(toTaskPayload(values), done)
  }

  return (
    <FormModal
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? t('editTitle') : t('createTitle')}
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={t('save')}
      cancelLabel={t('cancel')}
      pending={mutation.isPending}
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
        <div>
          <Controller
            control={control}
            name="project_id"
            render={({ field, fieldState }) => (
              <SelectField
                label={t('project')}
                required
                value={field.value}
                onValueChange={(value) => {
                  if (value === field.value) return
                  field.onChange(value)
                  // A milestone belongs to one project: a new project clears it.
                  setValue('milestone_id', '', { shouldDirty: true })
                }}
                triggerRef={field.ref}
                options={projectOptions}
                disabled={noProjects || projects.isPending}
                placeholder={projects.isPending ? t('projectsLoading') : noProjects ? t('noProjects') : t('projectPlaceholder')}
                error={fieldState.error?.message}
              />
            )}
          />
          {noProjects ? (
            <p className="mt-1.5 text-body-sm text-muted-foreground">
              {t.rich('noProjectsHint', {
                link: (chunks) => (
                  <Link href="/projects" className="font-medium text-primary underline-offset-4 hover:underline focus-visible:shadow-focus focus-visible:outline-none">
                    {chunks}
                  </Link>
                ),
              })}
            </p>
          ) : null}
        </div>
        <Controller
          control={control}
          name="milestone_id"
          render={({ field, fieldState }) => (
            <SelectField
              label={t('milestone')}
              value={field.value}
              onValueChange={(value) => field.onChange(value === NO_MILESTONE ? '' : value)}
              triggerRef={field.ref}
              options={milestoneOptions}
              disabled={!hasProject || milestoneOptions.length === 0}
              placeholder={t('milestonePlaceholder')}
              hint={hasProject ? undefined : t('milestoneNeedsProject')}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="task_stage_id"
          render={({ field, fieldState }) => (
            <SelectField
              label={t('stage')}
              required
              value={field.value}
              onValueChange={field.onChange}
              triggerRef={field.ref}
              options={stageOptions}
              disabled={stages.isPending}
              placeholder={stages.isPending ? t('stagesLoading') : t('stagePlaceholder')}
              error={fieldState.error?.message}
            />
          )}
        />
        <DateField label={t('startDate')} required error={errors.start_date?.message} {...register('start_date')} />
        <DateField
          label={t('dueDate')}
          required
          min={startDate || undefined}
          error={errors.due_date?.message}
          {...register('due_date')}
        />
        <Controller
          control={control}
          name="priority"
          render={({ field, fieldState }) => (
            <SelectField
              label={t('priority')}
              value={field.value}
              onValueChange={field.onChange}
              triggerRef={field.ref}
              error={fieldState.error?.message}
              options={TASK_PRIORITIES.map((value) => ({ value, label: tPriority(value) }))}
            />
          )}
        />
        <TextField
          label={t('progress')}
          placeholder={t('progressPlaceholder')}
          type="number"
          inputMode="numeric"
          min={0}
          max={100}
          step={1}
          hint={doneStageSelected ? t('progressDone') : undefined}
          error={errors.progress?.message}
          {...register('progress')}
        />
      </div>
    </FormModal>
  )
}
