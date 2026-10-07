import { CompanyDetailsHeader } from '@/features/companies/components/company-details-header'
import { CompanyNotFound } from '@/features/companies/components/company-not-found'

/* notFound() from page.tsx: an unknown, malformed or soft-deleted company id. Rendered inside
   the admin shell, with the page's header and a way back to the list. */
export default function CompanyNotFoundPage() {
  return (
    <>
      <CompanyDetailsHeader />
      <CompanyNotFound />
    </>
  )
}
