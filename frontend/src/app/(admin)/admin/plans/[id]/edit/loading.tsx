import { getTranslations } from 'next-intl/server'
import { PlanFormSkeleton } from '@/features/plans/components/plan-form-skeleton'
import { PlanPageHeader } from '@/features/plans/components/plan-page-header'

/* Shown while the edit page loads the plan on the server: the real header, a skeleton form. */
export default async function EditPlanLoading() {
  const t = await getTranslations('plans.form')

  return (
    <>
      <PlanPageHeader title={t('editTitle')} subtitle={t('editSubtitle')} backLabel={t('back')} />
      <div className="mt-3 rounded-xl border border-border p-4 md:p-card">
        <PlanFormSkeleton />
      </div>
    </>
  )
}
