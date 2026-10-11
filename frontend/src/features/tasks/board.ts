import type { Task, TaskBoard } from './types'

/* The board's optimistic move, kept pure (no client, no React) so it can be checked on its own.
   It mirrors TaskService::move on the server. */

export type TaskMove = {
  taskId: number
  /** The destination stage. */
  stageId: number
  /** 1-based, in the destination column. */
  position: number
}

/** Today in UTC (the server's day) as YYYY-MM-DD. */
const serverToday = () => new Date().toISOString().slice(0, 10)

/** The board with one card moved, as the server will hold it: positions renumbered in both
 *  columns, the counts, and the done-stage rules (into it → 100% and completed; out of it →
 *  not completed, progress kept; overdue only outside it). */
export function moveOnBoard(board: TaskBoard, { taskId, stageId, position }: TaskMove, today: string = serverToday()): TaskBoard {
  const source = board.columns.find((column) => column.tasks.some((task) => task.id === taskId))
  const target = board.columns.find((column) => column.stage.id === stageId)
  const task = source?.tasks.find((entry) => entry.id === taskId)
  if (!source || !target || !task) return board

  const stage = { id: target.stage.id, name: target.stage.name, color: target.stage.color, is_done_stage: target.stage.is_done_stage }
  const done = stage.is_done_stage
  const moved: Task = {
    ...task,
    task_stage_id: stage.id,
    stage,
    progress: done ? 100 : task.progress,
    completed_at: done ? (task.stage.is_done_stage ? task.completed_at : new Date().toISOString()) : null,
    is_overdue: !done && task.due_date < today,
  }

  return {
    columns: board.columns.map((column) => {
      if (column !== source && column !== target) return column
      let tasks = column.tasks.filter((entry) => entry.id !== taskId)
      if (column === target) {
        const index = Math.min(Math.max(position - 1, 0), tasks.length)
        tasks = [...tasks.slice(0, index), moved, ...tasks.slice(index)]
      }
      const numbered = tasks.map((entry, index) => (entry.position === index + 1 ? entry : { ...entry, position: index + 1 }))
      return { ...column, count: numbered.length, tasks: numbered }
    }),
  }
}
