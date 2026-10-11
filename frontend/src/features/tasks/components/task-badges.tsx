import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { TruncatedBadge } from '@/components/ui/truncated-badge'
import { isHexColor } from '@/lib/hex-color'
import type { Task, TaskPriority, TaskStageRef } from '@/features/tasks/types'

/* The Tasks screenshot's badges — Badge.md pills with the approved `outlined` hairline:
   Priority  Low gray (`neutral`) · Medium blue (`info`) · High amber (`amber`) · Urgent red
             (`danger`) — the same tones as the project priority badges.
   Milestone violet (`violet`), cut with an ellipsis and the full title in a tooltip.
   Project   indigo (`indigo`, Phase 0 decision 6), cut the same way.
   Stage     the stage's own colour as a 10px dot before its name (as on the board's columns).
   Texts are the API's own. */

const PRIORITY_TONE = {
  low: 'neutral',
  medium: 'info',
  high: 'amber',
  urgent: 'danger',
} as const satisfies Record<TaskPriority, React.ComponentProps<typeof Badge>['tone']>

export function TaskPriorityBadge({ task, size }: { task: Pick<Task, 'priority' | 'priority_label'>; size?: 'default' | 'sm' }) {
  return (
    <Badge tone={PRIORITY_TONE[task.priority]} size={size} outlined className="shrink-0">
      {task.priority_label}
    </Badge>
  )
}

export function TaskMilestoneBadge({ title, size, className }: { title: string; size?: 'default' | 'sm'; className?: string }) {
  return (
    <TruncatedBadge tone="violet" size={size} outlined className={className}>
      {title}
    </TruncatedBadge>
  )
}

export function TaskProjectChip({ name, size, className }: { name: string; size?: 'default' | 'sm'; className?: string }) {
  return (
    <TruncatedBadge tone="indigo" size={size} outlined className={className}>
      {name}
    </TruncatedBadge>
  )
}

export function TaskStageLabel({ stage }: { stage: Pick<TaskStageRef, 'name' | 'color'> }) {
  const valid = isHexColor(stage.color)
  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span
        aria-hidden="true"
        className={valid ? 'size-2.5 shrink-0 rounded-full' : 'size-2.5 shrink-0 rounded-full bg-neutral'}
        style={valid ? { backgroundColor: stage.color } : undefined}
      />
      <span className="truncate">{stage.name}</span>
    </span>
  )
}
