import { InvoiceDetailsSkeleton } from '@/features/invoices/components/invoice-details-page'

/* While the server loads the invoice: skeletons in the page's own layout. */
export default function InvoiceLoading() {
  return <InvoiceDetailsSkeleton />
}
