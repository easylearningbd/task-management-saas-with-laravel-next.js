import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { CreateInvoicePage } from '@/features/invoices/components/invoice-form-page'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('invoices.form')
  return { title: t('createTitle') }
}

/* Create Invoice (PRD §6.8, PAGE SPEC B). The whole page is the client <CreateInvoicePage />;
   guarded by the (company) layout. The API scopes the clients, projects, items, tasks and taxes
   it offers — and every write — to the signed-in company. */
export default function CompanyCreateInvoicePage() {
  return <CreateInvoicePage />
}
