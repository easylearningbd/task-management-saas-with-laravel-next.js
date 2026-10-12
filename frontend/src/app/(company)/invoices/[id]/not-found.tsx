import { InvoiceNotFound } from '@/features/invoices/components/invoice-form-page'

/* notFound() from a page under /invoices/{id}: a malformed, unknown, deleted or other company's
   invoice id. Rendered inside the company shell, with a way back to the list. */
export default function InvoiceNotFoundPage() {
  return <InvoiceNotFound />
}
