'use client'

import * as React from 'react'
import { Calendar, ChartColumn, DollarSign, FileText, Flag, Folder, Target } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { DonutChart } from '@/components/shared/charts/donut-chart'
import { LabelledProgressBar } from '@/components/shared/labelled-progress-bar'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { ProgressRing } from '@/components/ui/progress-ring'
import { Skeleton } from '@/components/ui/skeleton'
import { useMoney } from '@/lib/format-money'
import { useMilestones } from '@/features/projects/api'
import { ProjectPriorityBadge } from '@/features/projects/components/project-badges'
import { ProjectClientCell } from '@/features/projects/components/project-columns'
import { SectionCard } from '@/features/projects/components/section-card'
import { useLocalDate } from '@/features/projects/format'
import type { ProjectTabProps } from '@/features/projects/tabs/registry'

/* The Overview tab (PAGE SPEC C):
   1. Project Description (FileText, blue tile) — the text, or a muted "No description".
   2. Two columns from `lg`: Timeline (Calendar tile) — Created (violet dot), Start Date (green
      dot), End Date (Flag), each with its date right-aligned behind a small Calendar glyph |
      Project Information (Folder tile) — Priority badge, Budget, Client (avatar, name, email).
   3. Three columns from `xl` (one below): Budget Analysis (DollarSign tile) — the donut, Spent
      in `danger`, Remaining in `chart-2`, from real expenses | Milestone Progress (Target
      tile) — one labelled bar per milestone in plan order, scrolling past ~6, or an empty
      message | Project Health (ChartColumn tile) — the health ring (Low < 40 red, Medium
      40–74 amber, High ≥ 75 green) beside Tasks Complete, Overdue (a `danger` pill when > 0)
      and Milestones.
   Tile hues are the stat set (blue is the screenshot's; the rest are a Phase 8 choice).
   Every figure is the API's (ProjectFigures) — nothing is computed here.
   TODO(tasks): progress, health and Tasks Complete read 0% / Low / 0/0 until tasks ship. */

export function OverviewTab({ project }: ProjectTabProps) {
  const t = useTranslations('projects.details.overview')
  const money = useMoney()
  const created = useLocalDate(project.created_at)
  const f = project.figures

  return (
    <div className="flex flex-col gap-4">
      <SectionCard icon={FileText} hue="blue" title={t('description')}>
        {project.description ? (
          <p className="text-body whitespace-pre-line break-words">{project.description}</p>
        ) : (
          <p className="text-body text-muted-foreground">{t('noDescription')}</p>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard icon={Calendar} hue="violet" title={t('timeline')}>
          <dl className="flex flex-col gap-4">
            <TimelineRow marker={<Dot className="bg-stat-violet-icon" />} label={t('created')} date={created} />
            <TimelineRow marker={<Dot className="bg-success" />} label={t('startDate')} date={project.start_date} />
            <TimelineRow marker={<Flag className="size-3.5 text-danger" aria-hidden="true" />} label={t('endDate')} date={project.end_date} />
          </dl>
        </SectionCard>

        <SectionCard icon={Folder} hue="amber" title={t('information')}>
          <dl className="flex flex-col gap-4">
            <InfoRow label={t('priority')}>
              <ProjectPriorityBadge project={project} />
            </InfoRow>
            <InfoRow label={t('budget')}>
              <span className="font-mono text-money">{money(project.budget)}</span>
            </InfoRow>
            <InfoRow label={t('client')}>
              <ProjectClientCell project={project} className="max-w-64" />
            </InfoRow>
          </dl>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <SectionCard icon={DollarSign} hue="emerald" title={t('budgetAnalysis')}>
          <DonutChart
            label={t('budgetSummary', { spent: money(f.budget.spent), remaining: money(f.budget.remaining) })}
            segments={[
              {
                id: 'spent',
                label: t('spent'),
                value: Math.max(0, Number(f.budget.spent)),
                color: 'danger',
                detail: t('amountPercent', { amount: money(f.budget.spent), percent: f.budget.spent_percent }),
              },
              {
                id: 'remaining',
                label: t('remaining'),
                value: Math.max(0, Number(f.budget.remaining)),
                color: 'chart-2',
                detail: t('amountPercent', { amount: money(f.budget.remaining), percent: f.budget.remaining_percent }),
              },
            ]}
          />
        </SectionCard>

        <SectionCard icon={Target} hue="violet" title={t('milestoneProgress')}>
          <MilestoneProgress projectId={project.id} />
        </SectionCard>

        <SectionCard icon={ChartColumn} hue="blue" title={t('health')}>
          <div className="flex flex-wrap items-center gap-5">
            {/* TODO(tasks): the ring is tasks-based progress — 0% / "Low" until tasks ship. */}
            <ProgressRing size="md" tone="health" value={f.progress} unit={f.health.label} label={t('healthLabel', { percent: f.progress, level: f.health.label })} />
            <dl className="flex min-w-0 flex-1 basis-36 flex-col gap-3">
              <InfoRow label={t('tasksComplete')}>
                {/* TODO(tasks): 0/0 until the tasks module ships. */}
                <span className="text-body font-medium tabular-nums">{t('ratio', { done: f.tasks.completed, total: f.tasks.total })}</span>
              </InfoRow>
              <InfoRow label={t('overdue')}>
                {f.overdue > 0 ? (
                  <Badge tone="danger" outlined>
                    {f.overdue}
                  </Badge>
                ) : (
                  <span className="text-body font-medium tabular-nums">{f.overdue}</span>
                )}
              </InfoRow>
              <InfoRow label={t('milestones')}>
                <span className="text-body font-medium tabular-nums">{t('ratio', { done: f.milestones.completed, total: f.milestones.total })}</span>
              </InfoRow>
            </dl>
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

function Dot({ className }: { className: string }) {
  return <span aria-hidden="true" className={`size-2.5 rounded-full ${className}`} />
}

function TimelineRow({ marker, label, date }: { marker: React.ReactNode; label: string; date: string | null }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex items-center gap-2.5 text-body">
        <span className="inline-flex w-3.5 justify-center">{marker}</span>
        {label}
      </dt>
      <dd className="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground-alt tabular-nums">
        <Calendar className="size-3.5 shrink-0" aria-hidden="true" />
        {date ?? <Skeleton className="h-4 w-20" />}
      </dd>
    </div>
  )
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="shrink-0 text-body text-muted-foreground">{label}</dt>
      <dd className="flex min-w-0 justify-end">{children}</dd>
    </div>
  )
}

function MilestoneProgress({ projectId }: { projectId: number }) {
  const t = useTranslations('projects.details.overview')
  const milestones = useMilestones(projectId)

  if (milestones.isPending) {
    return (
      <div className="flex flex-col gap-4" aria-hidden="true">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i}>
            <div className="mb-2 flex justify-between">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-8" />
            </div>
            <Skeleton className="h-1.5 w-full" />
          </div>
        ))}
      </div>
    )
  }

  const list = milestones.data ?? []
  if (list.length === 0) {
    return <EmptyState icon={Target} message={t('noMilestones')} className="py-6" />
  }

  return (
    <ul aria-label={t('milestoneProgress')} className="-mr-2 flex max-h-64 flex-col gap-4 overflow-y-auto pr-2">
      {list.map((milestone) => (
        <li key={milestone.id}>
          <LabelledProgressBar label={milestone.title} value={milestone.progress} />
        </li>
      ))}
    </ul>
  )
}
