import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { PlanForm } from '@/features/plans/components/plan-form'
import { PlanPageHeader } from '@/features/plans/components/plan-page-header'

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('plans.form')
  return { title: t('createTitle') }
}

/* Create Plan (PRD §8.3) — the full-page form from the Create Plan screenshot. */
export default async function CreatePlanPage() {
  const t = await getTranslations('plans.form')

  return (
    <>
      <PlanPageHeader title={t('createTitle')} subtitle={t('createSubtitle')} backLabel={t('back')} />
      <div className="mt-3 rounded-xl border border-border p-4 md:p-card">
        <PlanForm />
      </div>
    </>
  )
}
