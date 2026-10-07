import { CompanyDetailsHeader } from '@/features/companies/components/company-details-header'
import { CompanyDetailsSkeleton } from '@/features/companies/components/company-details-page'

/* While the server loads the company: the real header, skeleton cards in the page's layout. */
export default function CompanyLoading() {
  return (
    <>
      <CompanyDetailsHeader />
      <CompanyDetailsSkeleton />
    </>
  )
}
