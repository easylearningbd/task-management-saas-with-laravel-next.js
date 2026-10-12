import { z } from 'zod'
import type { useTranslations } from 'next-intl'
import { isAtMost, previewInvoice, toHundredths } from '@/features/invoices/calc'
import { orNull } from '@/lib/form-values'
import { INVOICE_ITEM_TYPES, PAYMENT_TYPES, type Invoice, type InvoicePayload, type PaymentPayload } from '@/features/invoices/types'

/* The invoice forms, mirroring the server's requests (en.json `invoices.validation` carries the
   wording). Selects hold string ids; amounts stay strings (2 places at most — MoneyInput keeps them
   so); the server re-checks everything and computes every amount.

   Create / Edit (StoreInvoiceRequest + InvoiceService):
     client*, project* · invoice date*, due date* ≥ invoice date · discount 0 … subtotal ·
     taxes (0+) · notes ≤ 5000 · ≥ 1 line: type, its item / task*, description ≤ 2000,
     quantity* > 0, price* ≥ 0
   Add Payment (StoreInvoicePaymentRequest + PaymentService): amount* > 0 and ≤ the balance due ·
   method · notes ≤ 1000
   Billing details (UpdateInvoiceSettingsRequest): company name*, email*, the rest optional */

export const NOTES_MAX = 5000
export const DESCRIPTION_MAX = 2000
export const PAYMENT_NOTES_MAX = 1000

const ZERO = BigInt(0)
const DATE = /^\d{4}-\d{2}-\d{2}$/
const DECIMAL = /^\d+(\.\d{1,2})?$/

type ValidationT = ReturnType<typeof useTranslations<'invoices.validation'>>

export function createInvoiceSchema(t: ValidationT) {
  const line = z
    .object({
      key: z.string(),
      type: z.enum(INVOICE_ITEM_TYPES),
      source_id: z.string(),
      description: z.string().max(DESCRIPTION_MAX, { error: t('descriptionMax', { max: DESCRIPTION_MAX }) }),
      quantity: z.string().trim().regex(DECIMAL, { error: t('quantityInvalid') }),
      price: z.string().trim().regex(DECIMAL, { error: t('priceInvalid') }),
    })
    .superRefine((value, ctx) => {
      if (value.source_id === '') ctx.addIssue({ code: 'custom', path: ['source_id'], message: value.type === 'item' ? t('itemRequired') : t('taskRequired') })
      if (DECIMAL.test(value.quantity) && toHundredths(value.quantity) === ZERO) ctx.addIssue({ code: 'custom', path: ['quantity'], message: t('quantityInvalid') })
    })

  return z
    .object({
      client_id: z.string().min(1, { error: t('clientRequired') }),
      project_id: z.string().min(1, { error: t('projectRequired') }),
      invoice_date: z.string().regex(DATE, { error: t('invoiceDateRequired') }),
      due_date: z.string().regex(DATE, { error: t('dueDateRequired') }),
      tax_ids: z.array(z.string()),
      discount_amount: z.string().trim().refine((value) => value === '' || DECIMAL.test(value), { error: t('discountInvalid') }),
      notes: z.string().max(NOTES_MAX, { error: t('notesMax', { max: NOTES_MAX }) }),
      items: z.array(line).min(1, { error: t('itemsRequired') }),
    })
    .superRefine((value, ctx) => {
      if (DATE.test(value.invoice_date) && DATE.test(value.due_date) && value.due_date < value.invoice_date) {
        ctx.addIssue({ code: 'custom', path: ['due_date'], message: t('dueBeforeInvoice') })
      }
      const preview = previewInvoice(value.items, value.discount_amount, [])
      if (preview.discountTooHigh) {
        ctx.addIssue({ code: 'custom', path: ['discount_amount'], message: t('discountTooHigh', { subtotal: preview.subtotal }) })
      }
    })
}

export type InvoiceFormValues = z.infer<ReturnType<typeof createInvoiceSchema>>
export type InvoiceFormLine = InvoiceFormValues['items'][number]

let lineSeq = 0
/** A fresh line: Item, nothing chosen, quantity 1, price 0. `key` is the row's stable React key. */
export function emptyLine(): InvoiceFormLine {
  lineSeq += 1
  return { key: `line-${lineSeq}`, type: 'item', source_id: '', description: '', quantity: '1', price: '0' }
}

export function emptyInvoiceForm(today: string): InvoiceFormValues {
  return { client_id: '', project_id: '', invoice_date: today, due_date: '', tax_ids: [], discount_amount: '0', notes: '', items: [emptyLine()] }
}

/** Edit: the saved invoice as form values. Only taxes still active are kept (the server accepts
 *  no other); a line whose item / task was deleted since comes back with nothing chosen. */
export function toInvoiceFormValues(invoice: Invoice, activeTaxIds: ReadonlySet<number>): InvoiceFormValues {
  return {
    client_id: invoice.client ? String(invoice.client.id) : '',
    project_id: invoice.project ? String(invoice.project.id) : '',
    invoice_date: invoice.invoice_date,
    due_date: invoice.due_date,
    tax_ids: invoice.taxes.flatMap((tax) => (tax.tax_id !== null && activeTaxIds.has(tax.tax_id) ? [String(tax.tax_id)] : [])),
    discount_amount: invoice.discount_amount,
    notes: invoice.notes ?? '',
    items: invoice.items.map((item) => {
      const source = item.type === 'item' ? item.project_item_id : item.task_id
      return { ...emptyLine(), type: item.type, source_id: source === null ? '' : String(source), description: item.description, quantity: item.quantity, price: item.price }
    }),
  }
}

export function toInvoicePayload(values: InvoiceFormValues): InvoicePayload {
  return {
    client_id: Number(values.client_id),
    project_id: Number(values.project_id),
    invoice_date: values.invoice_date,
    due_date: values.due_date,
    discount_amount: values.discount_amount.trim() === '' ? '0' : values.discount_amount.trim(),
    tax_ids: values.tax_ids.map(Number),
    notes: orNull(values.notes),
    items: values.items.map((item) => ({
      type: item.type,
      project_item_id: item.type === 'item' ? Number(item.source_id) : null,
      task_id: item.type === 'task' ? Number(item.source_id) : null,
      description: orNull(item.description),
      quantity: item.quantity.trim(),
      price: item.price.trim(),
    })),
  }
}

/** `balance`: the exact balance due ("1234.00") — the maximum; `balanceLabel`: it formatted for the message ("$1,234.00"). */
export function createPaymentSchema(t: ValidationT, balance: string, balanceLabel: string) {
  return z.object({
    amount: z
      .string()
      .trim()
      .min(1, { error: t('amountRequired') })
      .regex(DECIMAL, { error: t('amountInvalid') })
      .refine((value) => toHundredths(value) > ZERO, { error: t('amountPositive') })
      .refine((value) => isAtMost(value, balance), { error: t('amountTooHigh', { balance: balanceLabel }) }),
    payment_type: z.enum(PAYMENT_TYPES),
    description: z.string().max(PAYMENT_NOTES_MAX, { error: t('notesMax', { max: PAYMENT_NOTES_MAX }) }),
  })
}

export type PaymentFormValues = z.infer<ReturnType<typeof createPaymentSchema>>

export const EMPTY_PAYMENT_FORM: PaymentFormValues = { amount: '', payment_type: 'bank_transfer', description: '' }

export function toPaymentPayload(values: PaymentFormValues): PaymentPayload {
  return { amount: values.amount.trim(), payment_type: values.payment_type, description: orNull(values.description) }
}

export function createSettingsSchema(t: ValidationT) {
  const optional = (max: number) => z.string().trim().max(max, { error: t('fieldMax', { max }) })
  return z.object({
    company_name: z.string().trim().min(1, { error: t('companyNameRequired') }).max(255, { error: t('fieldMax', { max: 255 }) }),
    email: z.string().trim().min(1, { error: t('emailRequired') }).pipe(z.email({ error: t('emailInvalid') })),
    phone: optional(50),
    address: optional(255),
    city: optional(100),
    state: optional(100),
    zip: optional(20),
    country: optional(100),
  })
}

export type SettingsFormValues = z.infer<ReturnType<typeof createSettingsSchema>>
