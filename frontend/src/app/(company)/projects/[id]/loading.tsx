import { ProjectDetailsSkeleton } from '@/features/projects/components/project-details-page'

/* While the server loads the project: skeletons in the page's own layout. */
export default function ProjectLoading() {
  return <ProjectDetailsSkeleton />
}
