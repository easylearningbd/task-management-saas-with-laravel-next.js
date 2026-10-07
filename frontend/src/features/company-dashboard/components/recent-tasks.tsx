'use client'

import { CircleAlert, Clock } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ListRow, ListRows } from '@/components/shared/list-row'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeading } from '@/components/ui/card'
import { ComingSoon } from '@/components/ui/coming-soon'
import { EmptyState } from '@/components/ui/empty-state'
import { RelativeTime } from '@/components/ui/relative-time'
import { ViewAllButton } from '@/features/admin-dashboard/components/view-all-link'
import { stageTone } from '@/features/company-dashboard/components/tones'
import type { RecentTask } from '@/features/company-dashboard/types'

/* design/user-dashboard panels.tsx `RecentTasks` (PRD §6.1): the latest five by activity —
   Clock tile, title, project, the stage badge (the company's own stage name; a done stage in
   `primary`, any other in `neutral`) and how long ago ("4 months ago"); "View all" is
   Coming soon. */
export function RecentTasks({ tasks }: { tasks: RecentTask[] }) {
  const t = useTranslations('companyDashboard.recentTasks')
  const tDashboard = useTranslations('companyDashboard')

  return (
    <Card className="flex h-full flex-col">
      <CardHeading
        divided
        title={t('title')}
        subtitle={t('subtitle')}
        action={
          <ComingSoon>
            <ViewAllButton label={tDashboard('viewAll')} />
          </ComingSoon>
        }
      />
      {tasks.length === 0 ? (
        <EmptyState icon={CircleAlert} message={t('empty')} className="flex flex-1 flex-col items-center justify-center" />
      ) : (
        <ListRows label={t('title')} className="flex-1">
          {tasks.map((task) => (
            <ListRow
              key={task.id}
              icon={Clock}
              title={task.title}
              subtitle={task.project}
              aside={
                <>
                  <Badge tone={stageTone(task.stage.isDone)} outlined>
                    {task.stage.name}
                  </Badge>
                  <RelativeTime iso={task.updatedAt} className="text-caption font-normal text-muted-foreground" />
                </>
              }
            />
          ))}
        </ListRows>
      )}
    </Card>
  )
}
