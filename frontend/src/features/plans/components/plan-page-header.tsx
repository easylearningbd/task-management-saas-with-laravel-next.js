import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { PageHeader } from '@/components/layout/app-shell'
import { Button } from '@/components/ui/button'

/* Create / Edit Plan header from the screenshot: title + subtitle, and an outline "← Back"
   (toolbar size) at the top right returning to the plans list. */
export function PlanPageHeader({ title, subtitle, backLabel }: { title: string; subtitle: string; backLabel: string }) {
  return (
    <PageHeader
      title={title}
      subtitle={subtitle}
      action={
        <Button asChild variant="outline" size="sm">
          <Link href="/admin/plans">
            <ArrowLeft className="size-icon" aria-hidden="true" />
            {backLabel}
          </Link>
        </Button>
      }
    />
  )
}
