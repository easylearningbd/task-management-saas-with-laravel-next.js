import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { CheckoutPage } from '@/features/billing/components/checkout-page'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('billing.checkout')
  return { title: t('metaTitle') }
}

/* The checkout (Billing PAGE SPEC B): /plans/checkout?plan={id}&duration={monthly|yearly}. The
   client page reads its plan from the URL (useSearchParams, hence the Suspense boundary) and
   guards the entry from the live catalog; the API re-checks everything on submit. Guarded by the
   (company) layout. */
export default function CompanyCheckoutPage() {
  return (
    <Suspense>
      <CheckoutPage />
    </Suspense>
  )
}
