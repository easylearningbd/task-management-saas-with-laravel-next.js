'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip } from '@/components/ui/tooltip'
import { useMilestones, useProjects } from '@/features/projects/api'
import { useTaskStages } from '@/features/task-stages/api'

/* The Tasks filter bar's selects, per the screenshot: "All Projects" · "All Milestones" ·
   "All Stages", inline after the search. Radix forbids "" as a value, so "all" = none.
   - All Projects: every project of the company, A–Z, up to the API's page maximum of 100
     (as All Clients on Projects).
   - All Milestones: the chosen project's milestones (plan order). Disabled — greyed, as drawn —
     until a project is chosen; its tooltip and description say why. A new project clears it.
   - All Stages: the company's active stages in board order (the board shows active stages only).
   An id from the URL that isn't loaded (yet) still gets an item, or Radix would show nothing. */

const ALL = 'all'

export function TaskProjectFilter({ value, onChange }: { value: string; onChange: (projectId: string) => void }) {
  const t = useTranslations('tasks.list.filters')
  const projects = useProjects({ page: 1, per_page: 100, sort: 'name', direction: 'asc' })
  const options = projects.data?.data ?? []
  const known = value === '' || options.some((project) => String(project.id) === value)

  return (
    <Select value={value || ALL} onValueChange={(next) => onChange(next === ALL ? '' : next)}>
      <SelectTrigger className="w-auto max-w-56" aria-label={t('projectLabel')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{t('allProjects')}</SelectItem>
        {options.map((project) => (
          <SelectItem key={project.id} value={String(project.id)}>
            {project.name}
          </SelectItem>
        ))}
        {!known ? <SelectItem value={value}>{t('unknownProject')}</SelectItem> : null}
      </SelectContent>
    </Select>
  )
}

export function TaskMilestoneFilter({
  projectId,
  value,
  onChange,
}: {
  /** '' = no project chosen: the select is disabled. */
  projectId: string
  value: string
  onChange: (milestoneId: string) => void
}) {
  const t = useTranslations('tasks.list.filters')
  const hintId = React.useId()
  const disabled = projectId === ''
  const milestones = useMilestones(disabled ? null : Number(projectId))
  const options = disabled ? [] : (milestones.data ?? [])
  const selected = disabled ? '' : value
  const known = selected === '' || options.some((milestone) => String(milestone.id) === selected)

  const select = (
    <Select value={selected || ALL} onValueChange={(next) => onChange(next === ALL ? '' : next)} disabled={disabled}>
      <SelectTrigger className="w-auto max-w-56" aria-label={t('milestoneLabel')} aria-describedby={disabled ? hintId : undefined}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{t('allMilestones')}</SelectItem>
        {options.map((milestone) => (
          <SelectItem key={milestone.id} value={String(milestone.id)}>
            {milestone.title}
          </SelectItem>
        ))}
        {!known ? <SelectItem value={selected}>{t('unknownMilestone')}</SelectItem> : null}
      </SelectContent>
    </Select>
  )

  if (!disabled) return select

  // A disabled trigger fires no pointer events, so the tooltip rides on a wrapper.
  return (
    <>
      <Tooltip content={t('milestoneNeedsProject')}>
        <span className="inline-flex">{select}</span>
      </Tooltip>
      <span id={hintId} className="sr-only">
        {t('milestoneNeedsProject')}
      </span>
    </>
  )
}

export function TaskStageFilter({ value, onChange }: { value: string; onChange: (stageId: string) => void }) {
  const t = useTranslations('tasks.list.filters')
  const stages = useTaskStages({ status: 'active' })
  const options = stages.data ?? []
  const known = value === '' || options.some((stage) => String(stage.id) === value)

  return (
    <Select value={value || ALL} onValueChange={(next) => onChange(next === ALL ? '' : next)}>
      <SelectTrigger className="w-auto max-w-56" aria-label={t('stageLabel')}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={ALL}>{t('allStages')}</SelectItem>
        {options.map((stage) => (
          <SelectItem key={stage.id} value={String(stage.id)}>
            {stage.name}
          </SelectItem>
        ))}
        {!known ? <SelectItem value={value}>{t('unknownStage')}</SelectItem> : null}
      </SelectContent>
    </Select>
  )
}
