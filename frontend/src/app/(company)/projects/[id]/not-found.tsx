import { ProjectNotFound } from '@/features/projects/components/project-not-found'

/* notFound() from page.tsx: a malformed, unknown, deleted or other company's project id. Rendered
   inside the company shell, with a way back to the list. */
export default function ProjectNotFoundPage() {
  return <ProjectNotFound />
}
