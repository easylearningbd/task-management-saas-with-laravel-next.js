'use client'

import * as React from 'react'
import { Calendar, Ellipsis } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ProgressBar } from '@/components/ui/progress-bar'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/cn'
import type { TaskAction } from '@/features/tasks/components/task-actions'
import { TaskMilestoneBadge, TaskPriorityBadge, TaskProjectChip } from '@/features/tasks/components/task-badges'
import type { Task } from '@/features/tasks/types'

/* One Kanban card of the Tasks screenshot, top to bottom — a `card` on `radius-lg` with a 1px
   `border` and `shadow-xs`, 16px padding:
   1. the title (`title-row` at 600, up to two lines) and a ghost "…" (Ellipsis) menu button:
      View · Edit · Delete (DropdownMenu.md; a missing handler reads "Coming soon"); the chosen
      action runs after the menu has closed, so focus comes back to "…" afterwards;
   2. the priority badge left, the milestone badge right — cut with an ellipsis
      ("Phase 1: Lau…") and the full title in a tooltip; nothing when there is no milestone;
   3. the start date (Calendar, muted) left and the due date (Calendar) right — `danger` when the
      task is overdue (the API's `is_overdue`: past due and not in the done stage), else muted;
   4. "Progress" with the percentage right-aligned, the green bar under it;
   5. the project as an indigo chip, cut the same way.
   The whole card is the drag handle (KanbanCard wraps it); its own buttons never start a drag.
   `overlay`: the copy under the pointer — same look, nothing focusable. */

export function TaskCard({ task, actions, overlay = false }: { task: Task; actions: TaskAction[]; overlay?: boolean }) {
  const t = useTranslations('tasks.list')
  // The chosen action runs once the menu has closed and handed focus back to "…", so a dialog it
  // opens returns focus there when it closes.
  const chosen = React.useRef<(() => void) | null>(null)

  return (
    <article className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-xs">
      <div className="flex items-start justify-between gap-2">
        <h3 className="line-clamp-2 min-w-0 text-title-row font-semibold break-words" title={task.title}>
          {task.title}
        </h3>
        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild disabled={overlay}>
            <Button variant="ghost" size="icon-sm" aria-label={t('menu', { title: task.title })} tabIndex={overlay ? -1 : undefined} className="-mt-1 -mr-2 shrink-0">
              <Ellipsis className="size-icon" aria-hidden="true" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-44"
            onCloseAutoFocus={() => {
              const action = chosen.current
              chosen.current = null
              if (action) window.setTimeout(action, 0)
            }}
          >
            {actions.map((action) => {
              const Icon = action.icon
              return (
                <DropdownMenuItem
                  key={action.id}
                  tone={action.tone}
                  disabled={action.disabledReason !== undefined}
                  hint={action.disabledReason}
                  onSelect={() => {
                    chosen.current = action.onClick
                  }}
                >
                  <Icon className="size-icon shrink-0" aria-hidden="true" />
                  {action.short}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="flex min-w-0 items-center justify-between gap-2">
        <TaskPriorityBadge task={task} size="sm" />
        {task.milestone ? <TaskMilestoneBadge title={task.milestone.title} size="sm" className="max-w-[60%]" /> : null}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-body-sm tabular-nums">
        <TaskDate date={task.start_date} label={t('startDate', { date: task.start_date })} className="text-muted-foreground" />
        <TaskDate
          date={task.due_date}
          label={task.is_overdue ? t('dueOverdue', { date: task.due_date }) : t('dueDate', { date: task.due_date })}
          className={task.is_overdue ? 'text-danger' : 'text-muted-foreground'}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between text-body-sm text-muted-foreground">
          <span>{t('progress')}</span>
          <span className="tabular-nums">{t('percent', { value: task.progress })}</span>
        </div>
        <ProgressBar value={task.progress} label={t('progressLabel', { title: task.title })} />
      </div>

      {task.project ? (
        <div className="flex min-w-0">
          <TaskProjectChip name={task.project.name} size="sm" />
        </div>
      ) : null}
    </article>
  )
}

function TaskDate({ date, label, className }: { date: string; label: string; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5', className)}>
      <Calendar className="size-3.5 shrink-0" aria-hidden="true" />
      <span aria-hidden="true">{date}</span>
      <span className="sr-only">{label}</span>
    </span>
  )
}

/** A card's loading placeholder. */
export function TaskCardSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-xs">
      <div className="flex justify-between gap-2">
        <Skeleton className="h-5 w-3/5" />
        <Skeleton className="size-5 rounded-md" />
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-5 w-14" />
        <Skeleton className="h-5 w-20" />
      </div>
      <div className="flex justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-1.5 w-full" />
      <Skeleton className="h-5 w-32" />
    </div>
  )
}
