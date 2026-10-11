import { TaskDetailsSkeleton } from '@/features/tasks/components/task-details-page'

/* While the server loads the task: skeletons in the page's own layout. */
export default function TaskLoading() {
  return <TaskDetailsSkeleton />
}
