'use client'

import * as React from 'react'
import { DollarSign, FolderOpen } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeading } from '@/components/ui/card'
import { ComingSoon } from '@/components/ui/coming-soon'
import { EmptyState } from '@/components/ui/empty-state'
import { NativeSelect } from '@/components/ui/native-select'
import { ProgressRing } from '@/components/ui/progress-ring'
import { ViewAllButton } from '@/features/admin-dashboard/components/view-all-link'
import { PROJECT_STATUS_TONE } from '@/features/company-dashboard/components/tones'
import { remainingBudget } from '@/features/company-dashboard/derive'
import { useCompanyDashboardFormat } from '@/features/company-dashboard/format'
import type { ProjectProgress as Project } from '@/features/company-dashboard/types'

/* design/user-dashboard panels.tsx `ProjectProgress` (PRD §6.1): a divided head with a 160px
   project picker and "View all" (Coming soon — no Projects page yet); the 144px completion
   ring ("complete" under the figure), then the project's name, status badge, Total Budget
   and the Spent / Remaining pair (Remaining derived, never sent). The ring stays `primary`:
   completion is a more-is-better figure. When the card is narrow the figures wrap under the ring. */
export function ProjectProgress({ projects, currency }: { projects: Project[]; currency: string }) {
  const t = useTranslations('companyDashboard.projectProgress')
  const tStatus = useTranslations('companyDashboard.projectStatus')
  const tDashboard = useTranslations('companyDashboard')
  const f = useCompanyDashboardFormat(currency)
  const [selectedId, setSelectedId] = React.useState<number | null>(projects[0]?.id ?? null)
  const project = projects.find((p) => p.id === selectedId) ?? projects[0]

  return (
    <Card className="flex h-full flex-col">
      <CardHeading
        divided
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <>
            {projects.length > 0 ? (
              <NativeSelect
                size="default"
                aria-label={t('selectLabel')}
                className="w-[160px] truncate"
                value={project?.id}
                onChange={(event) => setSelectedId(Number(event.target.value))}
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </NativeSelect>
            ) : null}
            <ComingSoon>
              <ViewAllButton label={tDashboard('viewAll')} />
            </ComingSoon>
          </>
        }
      />
      {project ? (
        <div className="flex flex-1 flex-wrap items-center gap-5 px-card py-4">
          <ProgressRing
            size="xl"
            tone="primary"
            value={project.progress}
            figure={f.percent(project.progress)}
            unit={t('complete')}
            label={t('ringLabel', { project: project.name })}
            className="mx-auto"
          />
          {/* design: min-w-[260px] (forces the wrap under the ring); capped at 100% so it fits 360px */}
          <div className="min-w-[min(260px,100%)] flex-1">
            <h3 className="text-title-section">{project.name}</h3>
            <Badge tone={PROJECT_STATUS_TONE[project.status]} outlined className="mt-2">
              {tStatus(project.status)}
            </Badge>

            <div className="mt-3.5 flex items-center gap-3 rounded-lg border border-border px-4 py-2.5">
              <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground">
                <DollarSign className="size-icon" strokeWidth={1.75} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-caption font-normal text-muted-foreground">{t('totalBudget')}</span>
                <span className="block text-title-section">{f.money(project.budget)}</span>
              </span>
            </div>

            <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border px-4 py-2.5">
                <span className="block text-caption font-normal text-muted-foreground">{t('spent')}</span>
                <span className="block text-title-section">{f.money(project.spent)}</span>
              </div>
              <div className="rounded-lg border border-border px-4 py-2.5">
                <span className="block text-caption font-normal text-muted-foreground">{t('remaining')}</span>
                <span className="block text-title-section">{f.money(remainingBudget(project))}</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState icon={FolderOpen} message={t('empty')} className="flex flex-1 flex-col items-center justify-center" />
      )}
    </Card>
  )
}
