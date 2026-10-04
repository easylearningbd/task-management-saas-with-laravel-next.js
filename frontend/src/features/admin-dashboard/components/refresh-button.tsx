'use client'

import { RefreshCw } from 'lucide-react'
import { useIsFetching, useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { adminDashboardKeys } from '@/features/admin-dashboard/api'
import { cn } from '@/lib/cn'

/* The page header's outline "Refresh" button from the design. Refetches every dashboard
   query; the glyph turns while any of them is in flight. */
export function RefreshButton() {
  const t = useTranslations('adminDashboard')
  const queryClient = useQueryClient()
  const fetching = useIsFetching({ queryKey: adminDashboardKeys.all }) > 0

  return (
    <Button
      variant="outline"
      disabled={fetching}
      aria-busy={fetching || undefined}
      onClick={() => queryClient.invalidateQueries({ queryKey: adminDashboardKeys.all })}
    >
      <RefreshCw className={cn('size-icon', fetching && 'animate-spin')} aria-hidden="true" />
      {t('refresh')}
    </Button>
  )
}
