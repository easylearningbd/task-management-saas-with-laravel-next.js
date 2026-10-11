'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { AttachedFilesCard } from '@/components/shared/attached-files-card'
import { useAttachTaskFile, useDetachTaskFile, useTaskFiles } from '@/features/tasks/api'
import type { TaskTabProps } from '@/features/tasks/tabs/registry'

/* The Files tab (no screenshot — it mirrors the project Files tab exactly): the shared
   AttachedFilesCard titled "Task Files" — the tiles, Download / Detach, and the same Media
   Library picker (upload, search, count badge, the plan's storage limit). Every change refreshes
   the Files (n) count. Detaching leaves the file in the media library. */

export function FilesTab({ task }: TaskTabProps) {
  const t = useTranslations('tasks.details.files')
  const files = useTaskFiles(task.id)
  const attach = useAttachTaskFile(task.id)
  const detach = useDetachTaskFile(task.id)

  return (
    <AttachedFilesCard
      title={t('title')}
      detachLabel={(name) => t('detachLabel', { name })}
      files={files}
      attach={attach.mutateAsync}
      detach={detach.mutateAsync}
    />
  )
}
