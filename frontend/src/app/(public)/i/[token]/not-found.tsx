import { PublicInvoiceNotFound } from '@/features/invoices/components/public-invoice-document'

/* notFound() from page.tsx: a malformed, unknown or deleted token — the standalone canvas with
   "Invoice not found"; no app chrome and nothing about why. */
export default function PublicInvoiceNotFoundPage() {
  return <PublicInvoiceNotFound />
}
