'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { KanbanBoard, type KanbanColumnData, type KanbanMove } from '@/components/shared/kanban-board'
import { Skeleton } from '@/components/ui/skeleton'
import type { TaskAction } from '@/features/tasks/components/task-actions'
import { TaskCard, TaskCardSkeleton } from '@/features/tasks/components/task-card'
import type { Task, TaskBoard as Board } from '@/features/tasks/types'

/* The Kanban board of the Tasks screenshot: one column per active stage, in the Task Stages
   order (Phase 0 decision 1), each with its dot, name and count; the cards are TaskCards.
   Each column's body scrolls past ~70% of the viewport; the board scrolls sideways.
   `onlyStageId`: the All Stages filter shows that one column (the API still sends the others,
   empty). Dragging is the page's call (`disabled` while filtered). */

const BODY = 'max-h-[70dvh]'

export function TaskBoard({
  board,
  actionsFor,
  onMove,
  disabled,
  onlyStageId,
}: {
  board: Board
  actionsFor: (task: Task) => TaskAction[]
  onMove: (move: KanbanMove<number, number>) => void
  disabled: boolean
  onlyStageId?: number
}) {
  const t = useTranslations('tasks.list')

  const columns = React.useMemo<KanbanColumnData<Task, number>[]>(
    () =>
      board.columns
        .filter((column) => onlyStageId === undefined || column.stage.id === onlyStageId)
        .map((column) => ({ id: column.stage.id, title: column.stage.name, color: column.stage.color, items: column.tasks })),
    [board, onlyStageId],
  )

  return (
    <KanbanBoard
      columns={columns}
      getItemId={getTaskId}
      getItemLabel={getTaskTitle}
      renderItem={(task, { overlay }) => <TaskCard task={task} actions={actionsFor(task)} overlay={overlay} />}
      onMove={onMove}
      disabled={disabled}
      label={t('boardLabel')}
      emptyColumnLabel={t('emptyColumn')}
      columnBodyClassName={BODY}
    />
  )
}

const getTaskId = (task: Task) => task.id
const getTaskTitle = (task: Task) => task.title

/** First load: four columns of placeholder cards, in the columns' own frame. */
export function TaskBoardSkeleton() {
  return (
    <div aria-hidden="true" className="flex gap-4 overflow-x-hidden pb-2">
      {Array.from({ length: 4 }, (_, column) => (
        <div key={column} className="flex min-w-72 flex-1 flex-col rounded-xl border border-border bg-muted">
          <div className="flex items-center gap-2 px-4 pt-4 pb-3">
            <Skeleton className="size-2.5 rounded-full bg-card" />
            <Skeleton className="h-4 w-24 bg-card" />
          </div>
          <div className="flex flex-col gap-3 px-3 pb-3">
            {Array.from({ length: column === 0 ? 3 : 2 }, (_, i) => (
              <TaskCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
