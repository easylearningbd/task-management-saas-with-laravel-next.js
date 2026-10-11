import { z } from 'zod'
import type { useTranslations } from 'next-intl'
import { isRealDate, orNull } from '@/lib/form-values'
import { TASK_PRIORITIES, type Task, type TaskPayload } from '@/features/tasks/types'

/* The task forms, mirroring the backend requests (en.json `tasks.validation` carries the same
   wording as their messages()):

   Task (StoreTaskRequest / UpdateTaskRequest)
     title          required | max:255            description  optional | max:5000
     project_id     required | one of the company's projects — the server checks
     milestone_id   optional | a milestone of THAT project — the server checks (422 under
                    Milestone); the form only offers the project's milestones
     task_stage_id  required | an active stage (edit: the current one may stay) — the server checks
     start_date     required | Y-m-d              due_date     required | Y-m-d | ≥ start_date
     priority       low…urgent (default medium)   progress     optional | whole 0–100 (default 0)
   Checklist item (StoreTaskChecklistItemRequest)   title required | max:255
   Text is trimmed first, as the server does; empty optionals are sent as null. Selects hold
   strings ('' = nothing chosen) and become numbers in the payload. */

export const TASK_TITLE_MAX = 255
export const TASK_DESCRIPTION_MAX = 5000
export const CHECKLIST_TITLE_MAX = 255

type ValidationT = ReturnType<typeof useTranslations<'tasks.validation'>>

type Key = Parameters<ValidationT>[0]

const ID = /^[1-9]\d*$/

/** A trimmed text field; `requiredKey` makes it required. */
const text = (t: ValidationT, max: number, maxKey: Key, requiredKey?: Key) => {
  const base = z.string().trim()
  return (requiredKey ? base.min(1, { error: t(requiredKey) }) : base).max(max, { error: t(maxKey, { max }) })
}

/** A required Y-m-d date. */
const date = (t: ValidationT, requiredKey: Key, invalidKey: Key) =>
  z.string().superRefine((value, ctx) => {
    if (value.trim() === '') ctx.addIssue({ code: 'custom', message: t(requiredKey) })
    else if (!isRealDate(value.trim())) ctx.addIssue({ code: 'custom', message: t(invalidKey) })
  })

/* ── Task ── */

export function createTaskSchema(t: ValidationT) {
  return z
    .object({
      title: text(t, TASK_TITLE_MAX, 'titleMax', 'titleRequired'),
      description: text(t, TASK_DESCRIPTION_MAX, 'descriptionMax'),
      project_id: z.string().refine((value) => ID.test(value), { error: t('projectRequired') }),
      // Optional: '' = no milestone.
      milestone_id: z.string().refine((value) => value === '' || ID.test(value)),
      task_stage_id: z.string().refine((value) => ID.test(value), { error: t('stageRequired') }),
      start_date: date(t, 'startRequired', 'startInvalid'),
      due_date: date(t, 'dueRequired', 'dueInvalid'),
      priority: z.enum(TASK_PRIORITIES),
      progress: z.string().superRefine((raw, ctx) => {
        const value = raw.trim()
        if (value === '') return // optional: the server stores 0
        if (!/^-?\d+$/.test(value)) ctx.addIssue({ code: 'custom', message: t('progressInteger') })
        else if (Number(value) < 0 || Number(value) > 100) ctx.addIssue({ code: 'custom', message: t('progressRange') })
      }),
    })
    .superRefine((values, ctx) => {
      // Both are valid Y-m-d strings by now, so string order is date order.
      if (isRealDate(values.start_date) && isRealDate(values.due_date) && values.due_date < values.start_date) {
        ctx.addIssue({ code: 'custom', path: ['due_date'], message: t('dueBeforeStart') })
      }
    })
}

export type TaskFormValues = z.infer<ReturnType<typeof createTaskSchema>>

/** Add New Task: empty, Priority Medium (PAGE SPEC B). Progress starts empty so its
 *  "enter progress" placeholder shows, as in the screenshot — empty is saved as 0 (the
 *  server's default). `defaults` pre-selects e.g. the project or stage the page is filtered on. */
export function emptyTaskForm(defaults: Partial<Pick<TaskFormValues, 'project_id' | 'task_stage_id'>> = {}): TaskFormValues {
  return {
    title: '',
    description: '',
    project_id: defaults.project_id ?? '',
    milestone_id: '',
    task_stage_id: defaults.task_stage_id ?? '',
    start_date: '',
    due_date: '',
    priority: 'medium',
    progress: '',
  }
}

export function taskToFormValues(task: Task): TaskFormValues {
  return {
    title: task.title,
    description: task.description ?? '',
    project_id: String(task.project_id),
    milestone_id: task.milestone_id === null ? '' : String(task.milestone_id),
    task_stage_id: String(task.task_stage_id),
    start_date: task.start_date,
    due_date: task.due_date,
    priority: task.priority,
    progress: String(task.progress),
  }
}

export function toTaskPayload(values: TaskFormValues): TaskPayload {
  const progress = values.progress.trim()
  return {
    title: values.title.trim(),
    description: orNull(values.description),
    project_id: Number(values.project_id),
    milestone_id: values.milestone_id === '' ? null : Number(values.milestone_id),
    task_stage_id: Number(values.task_stage_id),
    start_date: values.start_date.trim(),
    due_date: values.due_date.trim(),
    priority: values.priority,
    progress: progress === '' ? null : Number(progress),
  }
}

/* ── Checklist item ── */

export function createChecklistItemSchema(t: ValidationT) {
  return z.object({
    title: text(t, CHECKLIST_TITLE_MAX, 'checklistTitleMax', 'checklistTitleRequired'),
  })
}

export type ChecklistItemFormValues = z.infer<ReturnType<typeof createChecklistItemSchema>>

export const EMPTY_CHECKLIST_ITEM_FORM: ChecklistItemFormValues = { title: '' }
