'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { AttachedFilesCard } from '@/components/shared/attached-files-card'
import { useAttachProjectFile, useDetachProjectFile, useProjectFiles } from '@/features/projects/api'
import type { ProjectTabProps } from '@/features/projects/tabs/registry'

/* The Files tab (PAGE SPEC C and the Files screenshot): the shared AttachedFilesCard titled
   "Project Files" — the tiles, Download / Detach and the Media Library picker live there (the
   task Files tab uses the same card). Every change refreshes the tab count. */

export function FilesTab({ project }: ProjectTabProps) {
  const t = useTranslations('projects.files')
  const files = useProjectFiles(project.id)
  const attach = useAttachProjectFile(project.id)
  const detach = useDetachProjectFile(project.id)

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
