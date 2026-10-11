'use client'

import * as React from 'react'
import { Calendar, Flag, Folder, Layers, Signpost, SquareCheck, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { IdentityCell } from '@/components/shared/identity-cell'
import { Skeleton } from '@/components/ui/skeleton'
import { TintBadge } from '@/components/ui/tint-badge'
import { cn } from '@/lib/cn'
import { SectionCard } from '@/features/projects/components/section-card'
import { useLocalDate } from '@/features/projects/format'
import { TaskPriorityBadge } from '@/features/tasks/components/task-badges'
import type { TaskTabProps } from '@/features/tasks/tabs/registry'

/* The Details tab (PAGE SPEC C and the details screenshot):
   1. Task Description (SquareCheck, blue tile) — the text, or a muted "No description yet.".
   2. Two columns from `lg`:
      Timeline (Calendar tile, a rule under the head) — Created (a violet dot), Start Date (a green
        dot), Due Date (a Flag), each in a soft ring of its colour on a 1px connector, the date
        right-aligned behind a small Calendar glyph;
      Task Information (Layers tile, a rule under the head) — Stage (its own colour as a tinted
        badge), Priority (the priority badge), Project, Milestone (or "—"), each label with its
        glyph; then, under a rule, "Created By" with the creator's avatar, name and email.
   Every value is the API's; `created_at` is shown as the viewer's local day. */

export function DetailsTab({ task }: TaskTabProps) {
  const t = useTranslations('tasks.details.overview')
  const created = useLocalDate(task.created_at)

  return (
    <div className="flex flex-col gap-4">
      <SectionCard icon={SquareCheck} hue="blue" title={t('description')}>
        {task.description ? (
          <p className="text-body whitespace-pre-line break-words text-muted-foreground">{task.description}</p>
        ) : (
          <p className="text-body text-muted-foreground">{t('noDescription')}</p>
        )}
      </SectionCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard icon={Calendar} hue="indigo" title={t('timeline')} divided>
          <ol className="flex flex-col">
            <TimelineRow marker={<Dot className="bg-stat-violet-icon" />} ring="bg-stat-violet-icon-bg" label={t('created')} date={created} />
            <TimelineRow marker={<Dot className="bg-success" />} ring="bg-success-soft" label={t('startDate')} date={task.start_date} />
            <TimelineRow
              marker={<Flag className="size-3.5 text-stat-indigo-icon" aria-hidden="true" />}
              ring="bg-stat-indigo-icon-bg"
              label={t('dueDate')}
              date={task.due_date}
              last
            />
          </ol>
        </SectionCard>

        <SectionCard icon={Layers} hue="indigo" title={t('information')} divided>
          <dl className="flex flex-col gap-4">
            <InfoRow icon={Layers} label={t('stage')}>
              <TintBadge color={task.stage.color}>{task.stage.name}</TintBadge>
            </InfoRow>
            <InfoRow icon={Flag} label={t('priority')}>
              <TaskPriorityBadge task={task} />
            </InfoRow>
            <InfoRow icon={Folder} label={t('project')}>
              <span className="truncate text-body font-medium" title={task.project?.name}>
                {task.project?.name ?? t('none')}
              </span>
            </InfoRow>
            <InfoRow icon={Signpost} label={t('milestone')}>
              {task.milestone ? (
                <span className="truncate text-body font-medium" title={task.milestone.title}>
                  {task.milestone.title}
                </span>
              ) : (
                <span className="text-body text-muted-foreground">{t('none')}</span>
              )}
            </InfoRow>
          </dl>
          <div className="mt-4 border-t border-border pt-4">
            <p className="text-caption text-muted-foreground">{t('createdBy')}</p>
            {task.created_by ? (
              <IdentityCell
                className="mt-2"
                name={task.created_by.name}
                secondary={task.created_by.email}
                seed={task.created_by.id}
                avatarSrc={task.created_by.avatar}
              />
            ) : (
              <p className="mt-2 text-body text-muted-foreground">{t('none')}</p>
            )}
          </div>
        </SectionCard>
      </div>
    </div>
  )
}

function Dot({ className }: { className: string }) {
  return <span aria-hidden="true" className={cn('size-2.5 rounded-full', className)} />
}

/** One step: a 32px soft ring holding its marker, joined to the next by a 1px connector. */
function TimelineRow({
  marker,
  ring,
  label,
  date,
  last = false,
}: {
  marker: React.ReactNode
  ring: string
  label: string
  date: string | null
  last?: boolean
}) {
  return (
    <li className="flex gap-3">
      <div className="flex flex-col items-center">
        <span className={cn('inline-flex size-8 shrink-0 items-center justify-center rounded-full', ring)}>{marker}</span>
        {last ? null : <span aria-hidden="true" className="min-h-4 w-px flex-1 bg-border" />}
      </div>
      <div className={cn('flex min-w-0 flex-1 items-center justify-between gap-3', last ? 'h-8' : 'h-8 mb-4')}>
        <span className="text-body">{label}</span>
        <span className="inline-flex items-center gap-1.5 text-body-sm text-muted-foreground-alt tabular-nums">
          <Calendar className="size-3.5 shrink-0" aria-hidden="true" />
          {date ?? <Skeleton className="h-4 w-20" />}
        </span>
      </div>
    </li>
  )
}

function InfoRow({ icon: Icon, label, children }: { icon: LucideIcon; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="flex shrink-0 items-center gap-2 text-body text-muted-foreground">
        <Icon className="size-icon shrink-0" aria-hidden="true" />
        {label}
      </dt>
      <dd className="flex min-w-0 justify-end">{children}</dd>
    </div>
  )
}
