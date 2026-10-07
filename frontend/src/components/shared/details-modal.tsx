'use client'

import * as React from 'react'
import { Info, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { DetailList, type DetailItem } from '@/components/shared/detail-list'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/dialog'

/* Read-only "view details" modal — PRD §4.2 ("icon + title header, then labelled fields") on
   the Modal.md sheet. The header icon sits in the 40px `radius-tile` square used by stat
   tiles, on `primary-soft` with a `primary-strong` glyph; the default glyph is brand-book's
   `Info` ("details"). Fields are a two-column definition list (one column on phones): a
   `body-sm` `muted-foreground` label — with an optional leading icon — over a `body` value.
   Empty values read "-". The footer has one outline Close button (plus optional extras). */

export type { DetailItem }

export type DetailsModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  icon?: LucideIcon
  items: ReadonlyArray<DetailItem>
  /** Shows skeleton values (e.g. while the record loads). */
  loading?: boolean
  /** Extra footer actions, placed before Close. */
  actions?: React.ReactNode
  size?: 'sm' | 'lg'
}

export function DetailsModal({
  open,
  onOpenChange,
  title,
  icon: Icon = Info,
  items,
  loading = false,
  actions,
  size = 'lg',
}: DetailsModalProps) {
  const t = useTranslations('shared.modal')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size={size}
        closeLabel={t('close')}
        heading={
          <span className="flex items-center gap-3">
            <span className="inline-flex size-tile shrink-0 items-center justify-center rounded-tile bg-primary-soft text-primary-strong">
              <Icon className="size-icon-lg" aria-hidden="true" />
            </span>
            {title}
          </span>
        }
      >
        <DialogBody>
          <DetailList items={items} loading={loading} />
        </DialogBody>
        <DialogFooter>
          {actions}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
