import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import type { Project, ProjectPriority, ProjectStatus } from '@/features/projects/types'

/* The Projects screenshot's badges — Badge.md pills with the approved `outlined` hairline, as
   the dashboard design draws its priority chips (design/user-dashboard panels.tsx):
   Priority: Low gray (`neutral`) · Medium blue (`info`) · High amber (`amber`) · Urgent red (`danger`)
   Status:   Active green (`success`) · Completed blue (`info`) · On Hold amber (`amber`) ·
             Inactive gray (`neutral`)
   The text is the API's own label. */

const PRIORITY_TONE = {
  low: 'neutral',
  medium: 'info',
  high: 'amber',
  urgent: 'danger',
} as const satisfies Record<ProjectPriority, React.ComponentProps<typeof Badge>['tone']>

const STATUS_TONE = {
  active: 'success',
  completed: 'info',
  on_hold: 'amber',
  inactive: 'neutral',
} as const satisfies Record<ProjectStatus, React.ComponentProps<typeof Badge>['tone']>

export function ProjectPriorityBadge({ project }: { project: Pick<Project, 'priority' | 'priority_label'> }) {
  return (
    <Badge tone={PRIORITY_TONE[project.priority]} outlined>
      {project.priority_label}
    </Badge>
  )
}

export function ProjectStatusBadge({ project }: { project: Pick<Project, 'status' | 'status_label'> }) {
  return (
    <Badge tone={STATUS_TONE[project.status]} outlined>
      {project.status_label}
    </Badge>
  )
}
