import { InvoiceFormSkeleton } from '@/features/invoices/components/invoice-form-page'

/* While the server loads the invoice: skeletons in the form's own layout. */
export default function EditInvoiceLoading() {
  return <InvoiceFormSkeleton />
}
