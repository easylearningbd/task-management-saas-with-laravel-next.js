import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { CouponsPage } from '@/features/coupons/components/coupons-page'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('coupons.list')
  return { title: t('title') }
}

/* Super Admin coupons (task spec PAGE SPEC A). The whole page is the client <CouponsPage />:
   its list state lives in the URL (useSearchParams, hence the Suspense boundary). Guarded by
   the (admin) layout. */
export default function AdminCouponsPage() {
  return (
    <Suspense>
      <CouponsPage />
    </Suspense>
  )
}
