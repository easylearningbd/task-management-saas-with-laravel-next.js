'use client'

import * as React from 'react'
import { Info, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogBody, DialogContent, DialogFooter } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/cn'

/* Read-only "view details" modal — PRD §4.2 ("icon + title header, then labelled fields") on
   the Modal.md sheet. The header icon sits in the 40px `radius-tile` square used by stat
   tiles, on `primary-soft` with a `primary-strong` glyph; the default glyph is brand-book's
   `Info` ("details"). Fields are a two-column definition list (one column on phones): a
   `body-sm` `muted-foreground` label — with an optional leading icon — over a `body` value.
   Empty values read "-". The footer has one outline Close button (plus optional extras). */

export type DetailItem = {
  id: string
  label: string
  value: React.ReactNode
  icon?: LucideIcon
  /** Span both columns (long text). */
  wide?: boolean
}

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
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4.5 sm:grid-cols-2">
            {items.map(({ id, label, value, icon: ItemIcon, wide }) => (
              <div key={id} className={cn('min-w-0', wide && 'sm:col-span-2')}>
                <dt className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
                  {ItemIcon ? <ItemIcon className="size-icon shrink-0 opacity-muted-icon" aria-hidden="true" /> : null}
                  {label}
                </dt>
                <dd className="mt-1 text-body break-words text-foreground">
                  {loading ? <Skeleton className="h-5 w-32" /> : isBlank(value) ? '-' : value}
                </dd>
              </div>
            ))}
          </dl>
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

function isBlank(value: React.ReactNode): boolean {
  return value === null || value === undefined || value === ''
}
