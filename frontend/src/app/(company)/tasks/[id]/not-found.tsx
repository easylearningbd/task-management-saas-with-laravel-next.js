import { TaskNotFound } from '@/features/tasks/components/task-not-found'

/* notFound() from page.tsx: a malformed, unknown, deleted or other company's task id. Rendered
   inside the company shell, with a way back to the board. */
export default function TaskNotFoundPage() {
  return <TaskNotFound />
}
