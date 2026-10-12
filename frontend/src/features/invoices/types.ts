/* Mirrors the backend invoice resources (App\Http\Resources\InvoiceListResource, InvoiceResource,
   InvoicePaymentResource, TaxResource, PublicInvoiceResource) and requests (IndexInvoiceRequest,
   StoreInvoiceRequest, StoreInvoicePaymentRequest, UpdateInvoiceSettingsRequest). Everything is the
   signed-in company's own — the API never takes a `company_id`. Money is an exact 2-decimal string
   ("4707.00") computed by the server; dates are calendar dates ("2026-10-12"). */

export type InvoiceStatus = 'draft' | 'sent' | 'partial' | 'paid'
export const INVOICE_STATUSES = ['draft', 'sent', 'partial', 'paid'] as const satisfies ReadonlyArray<InvoiceStatus>

export type InvoiceItemType = 'item' | 'task'
export const INVOICE_ITEM_TYPES = ['item', 'task'] as const satisfies ReadonlyArray<InvoiceItemType>

export type PaymentType = 'credit_card' | 'bank_transfer' | 'cash' | 'cheque' | 'other'
export const PAYMENT_TYPES = ['credit_card', 'bank_transfer', 'cash', 'cheque', 'other'] as const satisfies ReadonlyArray<PaymentType>

/* ── The list ── */

export interface InvoiceListItem {
  id: number
  /** "INV-2026-0001" */
  invoice_number: string
  client: { id: number; name: string; email: string; initials: string } | null
  project: { id: number; name: string } | null
  invoice_date: string
  due_date: string
  total: string
  paid_amount: string
  balance_due: string
  status: InvoiceStatus
  status_label: string
  /** Past due with money owed — the red due date with "overdue" under it. */
  is_overdue: boolean
  /** Draft and Sent invoices can be edited and deleted (the row's pencil and trash). */
  can_edit: boolean
  created_at: string | null
}

/* ── One invoice ── */

export interface InvoiceLine {
  id: number
  type: InvoiceItemType
  project_item_id: number | null
  task_id: number | null
  description: string
  quantity: string
  price: string
  total: string
}

/** A tax as applied to the invoice — name and rate are snapshots taken at save time. */
export interface InvoiceTaxLine {
  tax_id: number | null
  name: string
  rate: string
  amount: string
}

export interface InvoicePayment {
  id: number
  invoice_id: number
  payment_date: string
  /** Always positive. */
  amount: string
  payment_type: PaymentType
  /** "Bank Transfer" — never the raw value. */
  payment_type_label: string
  /** "PAY000001" */
  reference: string
  status: 'paid'
  status_label: string
  /** Receipts aren't uploaded yet — always null ("—"). */
  receipt_url: null
  description: string | null
  created_at: string | null
}

export interface Invoice extends Omit<InvoiceListItem, 'client' | 'project'> {
  client: { id: number; name: string; email: string; phone: string; address: string; company_name: string; initials: string } | null
  project: { id: number; name: string; description: string | null } | null
  subtotal: string
  discount_amount: string
  tax_amount: string
  /** The applied taxes' combined rate ("15.00") — the summary's "Tax (15%)". */
  tax_rate: string
  notes: string | null
  /** The public share page is /i/{public_token}. */
  public_token: string
  sent_at: string | null
  items: InvoiceLine[]
  taxes: InvoiceTaxLine[]
  payments: InvoicePayment[]
  updated_at: string | null
}

/* ── Reference data ── */

export interface Tax {
  id: number
  name: string
  /** A percent, "10.00" */
  rate: string
  /** "VAT (10%)" */
  label: string
}

/** The company's "Billed From" block (GET / PUT /api/v1/settings/invoice-details). */
export interface InvoiceSettings {
  company_name: string | null
  email: string | null
  phone: string | null
  address: string | null
  city: string | null
  state: string | null
  zip: string | null
  country: string | null
}

export const INVOICE_SETTING_FIELDS = ['company_name', 'email', 'phone', 'address', 'city', 'state', 'zip', 'country'] as const satisfies ReadonlyArray<
  keyof InvoiceSettings
>

/** GET /api/v1/public/invoices/{token} — exactly what the share page shows; no ids. */
export interface PublicInvoice {
  invoice_number: string
  status: InvoiceStatus
  status_label: string
  invoice_date: string
  due_date: string
  billed_from: InvoiceSettings
  bill_to: { name: string; email: string; phone: string; address: string } | null
  project: { name: string } | null
  items: { description: string; quantity: string; price: string; total: string }[]
  subtotal: string
  discount_amount: string
  taxes: { name: string; rate: string; amount: string }[]
  tax_amount: string
  total: string
  paid_amount: string
  balance_due: string
  notes: string | null
}

/* ── Writes ── */

/** POST /api/v1/invoices · PUT …/{id} — the server computes every amount. */
export interface InvoicePayload {
  client_id: number
  project_id: number
  invoice_date: string
  due_date: string
  /** Flat, 0 … subtotal */
  discount_amount: string
  tax_ids: number[]
  notes: string | null
  items: {
    type: InvoiceItemType
    project_item_id: number | null
    task_id: number | null
    description: string | null
    quantity: string
    price: string
  }[]
}

/** POST /api/v1/invoices/{id}/payments — at most the balance due (422 otherwise). */
export interface PaymentPayload {
  amount: string
  payment_type: PaymentType
  description: string | null
}

/* ── The list's query ── */

export type InvoiceSortKey = 'invoice_number' | 'invoice_date' | 'due_date' | 'total' | 'balance_due'
export const INVOICE_SORT_KEYS = ['invoice_number', 'invoice_date', 'due_date', 'total', 'balance_due'] as const satisfies ReadonlyArray<InvoiceSortKey>

export type InvoiceFilterName = 'status' | 'client_id' | 'project_id' | 'date_from' | 'date_to' | 'overdue'

/** GET /api/v1/invoices — newest first by default. */
export interface InvoiceListParams {
  /** Invoice number, client name / email, project name. */
  search?: string
  status?: InvoiceStatus
  client_id?: number
  project_id?: number
  /** Invoice date range, inclusive (YYYY-MM-DD). */
  date_from?: string
  date_to?: string
  /** Past due with money owed only. */
  overdue?: 1
  sort?: InvoiceSortKey
  direction?: 'asc' | 'desc'
  page: number
  /** 1–100 */
  per_page: number
}
