import type { Metadata } from 'next'
import { Suspense } from 'react'
import { getTranslations } from 'next-intl/server'
import { ExpenseCategoriesPage } from '@/features/expense-categories/components/expense-categories-page'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('expenseCategories.page')
  return { title: t('title') }
}

/* Company expense categories (PRD §6.14) — the split form + table page. The whole page is the
   client <ExpenseCategoriesPage />: its list state lives in the URL (useSearchParams, hence the
   Suspense boundary). Guarded by the (company) layout; the API scopes every category to the
   signed-in company. */
export default function CompanyExpenseCategoriesPage() {
  return (
    <Suspense>
      <ExpenseCategoriesPage />
    </Suspense>
  )
}
