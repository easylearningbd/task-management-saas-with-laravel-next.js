import type { badgeVariants } from '@/components/ui/badge'
import type { VariantProps } from 'class-variance-authority'
import type { ContractStatus, Priority, ProjectStatus } from '@/features/company-dashboard/types'

/* Badge tones for the dashboard's statuses. The design's values (design/user-dashboard
   panels.tsx + README "Badge palette") first; the statuses the design doesn't show follow
   brand-book.md's status colours (Pending warning, Cancelled danger, Draft/Inactive neutral). */

type Tone = NonNullable<VariantProps<typeof badgeVariants>['tone']>

export const PRIORITY_TONE: Record<Priority, Tone> = {
  low: 'neutral', // not in the design
  medium: 'info',
  high: 'amber',
  urgent: 'danger',
}

export const CONTRACT_STATUS_TONE: Record<ContractStatus, Tone> = {
  draft: 'neutral', // not in the design
  pending: 'warning', // not in the design
  signed: 'info',
  active: 'success',
  completed: 'violet',
  cancelled: 'danger', // not in the design
}

export const PROJECT_STATUS_TONE: Record<ProjectStatus, Tone> = {
  active: 'success', // not in the design
  completed: 'info',
  on_hold: 'warning', // not in the design
  inactive: 'neutral', // not in the design
}

/** A task's stage: a done stage in `primary` ("Done"), any other in `neutral` ("Cancelled"). */
export const stageTone = (isDone: boolean): Tone => (isDone ? 'primary' : 'neutral')
