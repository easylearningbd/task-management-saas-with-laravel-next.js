import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations } from 'next-intl/server'
import { PlanForm } from '@/features/plans/components/plan-form'
import { PlanPageHeader } from '@/features/plans/components/plan-page-header'
import type { Plan } from '@/features/plans/types'
import { serverApiGet } from '@/lib/server-api'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('plans.form')
  return { title: t('editTitle') }
}

/* Edit Plan. The plan is loaded on the server so a missing or deleted id is a real 404
   (notFound() only works in Server Components); loading.tsx shows the form skeleton meanwhile. */
export default async function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  if (!/^\d+$/.test(id)) notFound()

  const result = await serverApiGet<Plan>(`/api/v1/admin/plans/${id}`)
  if (result.status === 404) notFound()
  if (!result.data) {
    throw new Error(`Could not load plan ${id} (status ${result.status}).`)
  }

  const t = await getTranslations('plans.form')

  return (
    <>
      <PlanPageHeader title={t('editTitle')} subtitle={t('editSubtitle')} backLabel={t('back')} />
      <div className="mt-3 rounded-xl border border-border p-4 md:p-card">
        <PlanForm plan={result.data} />
      </div>
    </>
  )
}
