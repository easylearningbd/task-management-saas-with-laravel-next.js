import { z } from 'zod'
import type { useTranslations } from 'next-intl'
import { isRealDate, moneyProblem, orNull, type MoneyProblem } from '@/lib/form-values'
import {
  MILESTONE_STATUSES,
  PROJECT_ITEM_UNITS,
  PROJECT_PRIORITIES,
  PROJECT_STATUSES,
  type Expense,
  type ExpensePayload,
  type Milestone,
  type MilestonePayload,
  type Project,
  type ProjectItem,
  type ProjectItemPayload,
  type ProjectNote,
  type ProjectNotePayload,
  type ProjectPayload,
} from '@/features/projects/types'

/* The project forms, mirroring the backend requests (en.json `projects.validation` carries the
   same wording as their messages()):

   Project (StoreProjectRequest / UpdateProjectRequest)
     name         required | max:255            description  optional | max:5000
     client_id    required | one of the company's active clients (edit: the current one may
                  stay even if deactivated since) — the server checks; its 422 lands under Client
     start_date   required | Y-m-d              end_date     required | Y-m-d | ≥ start_date
     budget       required | ≥ 0 | 2 decimals | ≤ 9999999999999.99
     priority     low…urgent (default medium)   status       active…inactive (default active)
   Milestone (decision 7: no Start Date field)
     title required | max:255 · description max:5000 · due_date required | Y-m-d ·
     progress optional | whole 0–100 · status pending | in_progress | completed
   Item     name required | max:255 · description max:5000 · default_price as budget · unit enum
   Note     title required | max:255 · content required | max:20000
   Expense  title required | max:255 · description max:5000 · amount as budget ·
            expense_date required | Y-m-d · expense_category_id required (active category —
            the server checks)
   Text is trimmed first, as the server does; empty optionals are sent as null. Selects hold
   strings ('' = nothing chosen) and become numbers in the payload. */

export const PROJECT_NAME_MAX = 255
export const DESCRIPTION_MAX = 5000
export const TITLE_MAX = 255
export const NOTE_CONTENT_MAX = 20000

type ValidationT = ReturnType<typeof useTranslations<'projects.validation'>>

type Key = Parameters<ValidationT>[0]

/** A trimmed text field; `requiredKey` makes it required. */
const text = (t: ValidationT, max: number, maxKey: Key, requiredKey?: Key) => {
  const base = z.string().trim()
  return (requiredKey ? base.min(1, { error: t(requiredKey) }) : base).max(max, { error: t(maxKey, { max }) })
}

/** A money field; its messages are named after it ("budgetNegative" → "The budget can't be negative."). */
const money = (t: ValidationT, field: 'budget' | 'price' | 'amount') =>
  z.string().superRefine((value, ctx) => {
    const problem = moneyProblem(value)
    if (!problem) return
    const keys: Record<MoneyProblem, Key> = {
      required: `${field}Required`,
      invalid: `${field}Invalid`,
      decimals: `${field}Decimals`,
      negative: `${field}Negative`,
      tooLarge: `${field}TooLarge`,
    }
    ctx.addIssue({ code: 'custom', message: t(keys[problem]) })
  })

/** A required Y-m-d date. */
const date = (t: ValidationT, requiredKey: Key, invalidKey: Key) =>
  z.string().superRefine((value, ctx) => {
    if (value.trim() === '') ctx.addIssue({ code: 'custom', message: t(requiredKey) })
    else if (!isRealDate(value.trim())) ctx.addIssue({ code: 'custom', message: t(invalidKey) })
  })

/** A select holding an id as a string. */
const idSelect = (t: ValidationT, requiredKey: Key) =>
  z.string().refine((value) => /^[1-9]\d*$/.test(value), { error: t(requiredKey) })

/* ── Project ── */

export function createProjectSchema(t: ValidationT) {
  return z
    .object({
      name: text(t, PROJECT_NAME_MAX, 'nameMax', 'nameRequired'),
      description: text(t, DESCRIPTION_MAX, 'descriptionMax'),
      client_id: idSelect(t, 'clientRequired'),
      start_date: date(t, 'startRequired', 'startInvalid'),
      end_date: date(t, 'endRequired', 'endInvalid'),
      budget: money(t, 'budget'),
      priority: z.enum(PROJECT_PRIORITIES),
      status: z.enum(PROJECT_STATUSES),
    })
    .superRefine((values, ctx) => {
      // Both are valid Y-m-d strings by now, so string order is date order.
      if (isRealDate(values.start_date) && isRealDate(values.end_date) && values.end_date < values.start_date) {
        ctx.addIssue({ code: 'custom', path: ['end_date'], message: t('endBeforeStart') })
      }
    })
}

export type ProjectFormValues = z.infer<ReturnType<typeof createProjectSchema>>

/** Add New Project: empty, Priority Medium, Status Active (PAGE SPEC B). */
export const EMPTY_PROJECT_FORM: ProjectFormValues = {
  name: '',
  description: '',
  client_id: '',
  start_date: '',
  end_date: '',
  budget: '',
  priority: 'medium',
  status: 'active',
}

export function projectToFormValues(project: Project): ProjectFormValues {
  return {
    name: project.name,
    description: project.description ?? '',
    client_id: String(project.client_id),
    start_date: project.start_date,
    end_date: project.end_date,
    budget: project.budget,
    priority: project.priority,
    status: project.status,
  }
}

export function toProjectPayload(values: ProjectFormValues): ProjectPayload {
  return {
    name: values.name.trim(),
    description: orNull(values.description),
    client_id: Number(values.client_id),
    start_date: values.start_date.trim(),
    end_date: values.end_date.trim(),
    budget: values.budget.trim(),
    priority: values.priority,
    status: values.status,
  }
}

/* ── Milestone ── */

export function createMilestoneSchema(t: ValidationT) {
  return z.object({
    title: text(t, TITLE_MAX, 'titleMax', 'titleRequired'),
    description: text(t, DESCRIPTION_MAX, 'descriptionMax'),
    due_date: date(t, 'dueRequired', 'dueInvalid'),
    progress: z.string().superRefine((raw, ctx) => {
      const value = raw.trim()
      if (value === '') return // optional: the server stores 0
      if (!/^-?\d+$/.test(value)) ctx.addIssue({ code: 'custom', message: t('progressInteger') })
      else if (Number(value) < 0 || Number(value) > 100) ctx.addIssue({ code: 'custom', message: t('progressRange') })
    }),
    status: z.enum(MILESTONE_STATUSES),
  })
}

export type MilestoneFormValues = z.infer<ReturnType<typeof createMilestoneSchema>>

export const EMPTY_MILESTONE_FORM: MilestoneFormValues = {
  title: '',
  description: '',
  due_date: '',
  progress: '0',
  status: 'pending',
}

export function milestoneToFormValues(milestone: Milestone): MilestoneFormValues {
  return {
    title: milestone.title,
    description: milestone.description ?? '',
    due_date: milestone.due_date ?? '',
    progress: String(milestone.progress),
    status: milestone.status,
  }
}

export function toMilestonePayload(values: MilestoneFormValues): MilestonePayload {
  const progress = values.progress.trim()
  return {
    title: values.title.trim(),
    description: orNull(values.description),
    due_date: values.due_date.trim(),
    progress: progress === '' ? null : Number(progress),
    status: values.status,
  }
}

/* ── Item ── */

export function createItemSchema(t: ValidationT) {
  return z.object({
    name: text(t, TITLE_MAX, 'itemNameMax', 'itemNameRequired'),
    description: text(t, DESCRIPTION_MAX, 'descriptionMax'),
    default_price: money(t, 'price'),
    // '' until chosen ("select unit")
    unit: z.string().refine((value) => (PROJECT_ITEM_UNITS as ReadonlyArray<string>).includes(value), { error: t('unitRequired') }),
  })
}

export type ItemFormValues = z.infer<ReturnType<typeof createItemSchema>>

export const EMPTY_ITEM_FORM: ItemFormValues = { name: '', description: '', default_price: '', unit: '' }

export function itemToFormValues(item: ProjectItem): ItemFormValues {
  return { name: item.name, description: item.description ?? '', default_price: item.default_price, unit: item.unit }
}

export function toItemPayload(values: ItemFormValues): ProjectItemPayload {
  return {
    name: values.name.trim(),
    description: orNull(values.description),
    default_price: values.default_price.trim(),
    unit: values.unit as ProjectItemPayload['unit'], // checked by the schema
  }
}

/* ── Note ── */

export function createNoteSchema(t: ValidationT) {
  return z.object({
    title: text(t, TITLE_MAX, 'titleMax', 'titleRequired'),
    content: text(t, NOTE_CONTENT_MAX, 'contentMax', 'contentRequired'),
  })
}

export type NoteFormValues = z.infer<ReturnType<typeof createNoteSchema>>

export const EMPTY_NOTE_FORM: NoteFormValues = { title: '', content: '' }

export function noteToFormValues(note: ProjectNote): NoteFormValues {
  return { title: note.title, content: note.content }
}

export function toNotePayload(values: NoteFormValues): ProjectNotePayload {
  return { title: values.title.trim(), content: values.content.trim() }
}

/* ── Expense ── */

export function createExpenseSchema(t: ValidationT) {
  return z.object({
    title: text(t, TITLE_MAX, 'titleMax', 'titleRequired'),
    description: text(t, DESCRIPTION_MAX, 'descriptionMax'),
    amount: money(t, 'amount'),
    expense_date: date(t, 'expenseDateRequired', 'expenseDateInvalid'),
    expense_category_id: idSelect(t, 'categoryRequired'),
  })
}

export type ExpenseFormValues = z.infer<ReturnType<typeof createExpenseSchema>>

export const EMPTY_EXPENSE_FORM: ExpenseFormValues = {
  title: '',
  description: '',
  amount: '',
  expense_date: '',
  expense_category_id: '',
}

export function expenseToFormValues(expense: Expense): ExpenseFormValues {
  return {
    title: expense.title,
    description: expense.description ?? '',
    amount: expense.amount,
    expense_date: expense.expense_date,
    expense_category_id: String(expense.expense_category_id),
  }
}

export function toExpensePayload(values: ExpenseFormValues): ExpensePayload {
  return {
    title: values.title.trim(),
    description: orNull(values.description),
    amount: values.amount.trim(),
    expense_date: values.expense_date.trim(),
    expense_category_id: Number(values.expense_category_id),
  }
}
