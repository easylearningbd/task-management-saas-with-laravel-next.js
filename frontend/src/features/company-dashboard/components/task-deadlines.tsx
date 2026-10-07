'use client'

import { CircleAlert, SquareCheck } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { ListRow, ListRows } from '@/components/shared/list-row'
import { Badge } from '@/components/ui/badge'
import { Card, CardHeading } from '@/components/ui/card'
import { EmptyState } from '@/components/ui/empty-state'
import { PRIORITY_TONE } from '@/features/company-dashboard/components/tones'
import type { TaskDeadline } from '@/features/company-dashboard/types'

/* design/user-dashboard panels.tsx `TaskDeadlines` (PRD §6.1): "Upcoming Task Deadlines" —
   no "View all" in the design. Each row: SquareCheck tile, title, project, the due date in
   `danger` (YYYY-MM-DD) and the priority badge; rows at the relaxed 14px padding. */
export function TaskDeadlines({ deadlines }: { deadlines: TaskDeadline[] }) {
  const t = useTranslations('companyDashboard.taskDeadlines')
  const tPriority = useTranslations('companyDashboard.priority')

  return (
    <Card className="flex h-full flex-col">
      <CardHeading divided title={t('title')} subtitle={t('subtitle')} />
      {deadlines.length === 0 ? (
        <EmptyState icon={CircleAlert} message={t('empty')} className="flex flex-1 flex-col items-center justify-center" />
      ) : (
        <ListRows label={t('title')} className="flex-1">
          {deadlines.map((task) => (
            <ListRow
              key={task.id}
              icon={SquareCheck}
              density="relaxed"
              title={task.title}
              subtitle={task.project}
              aside={
                <>
                  <time dateTime={task.dueDate} className="text-body-sm font-medium text-danger">
                    {task.dueDate}
                  </time>
                  <Badge tone={PRIORITY_TONE[task.priority]} outlined>
                    {tPriority(task.priority)}
                  </Badge>
                </>
              }
            />
          ))}
        </ListRows>
      )}
    </Card>
  )
}
