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
   Empty values read "-". The footer has one outline Close button (then any actions, e.g. Approve).
   `divided` draws the 1px rule under the header (Modal.md's divided header); `footer={false}`
   drops the Close footer when the header's × is enough. `children` replaces the field list
   when a record needs its own body layout (badge rows, inset text) — built from DetailList.
   `badge` sits after the title (a status); `closeLabel` renames the dismiss button ("Cancel" when
   the footer's `actions` decide something, e.g. Approve). */

export type { DetailItem }

export type DetailsModalProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  icon?: LucideIcon
  /** The labelled fields (ignored when `children` is given). */
  items?: ReadonlyArray<DetailItem>
  /** A custom body instead of the field list. */
  children?: React.ReactNode
  /** Shows skeleton values (e.g. while the record loads). */
  loading?: boolean
  /** Footer actions, after the dismiss button (Modal.md: Cancel, then the primary action). */
  actions?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  /** A 1px rule under the header (as in the details screenshots). */
  divided?: boolean
  /** The Close footer; off when the header's × is the only way out (as in the details screenshots). */
  footer?: boolean
  /** Next to the title in the header (e.g. the record's status badge). */
  badge?: React.ReactNode
  /** The footer's dismiss button (default "Close" — "Cancel" when `actions` decide something). */
  closeLabel?: string
  /** Disables the dismiss button (e.g. while an action saves). */
  closeDisabled?: boolean
}

export function DetailsModal({
  open,
  onOpenChange,
  title,
  icon: Icon = Info,
  items = [],
  children,
  loading = false,
  actions,
  size = 'lg',
  divided = false,
  footer = true,
  badge,
  closeLabel,
  closeDisabled = false,
}: DetailsModalProps) {
  const t = useTranslations('shared.modal')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size={size}
        divided={divided}
        closeLabel={t('close')}
        heading={
          <span className="flex items-center gap-3">
            <span className="inline-flex size-tile shrink-0 items-center justify-center rounded-tile bg-primary-soft text-primary-strong">
              <Icon className="size-icon-lg" aria-hidden="true" />
            </span>
            <span className="min-w-0">{title}</span>
            {badge}
          </span>
        }
      >
        <DialogBody>
          {children ?? <DetailList items={items} loading={loading} />}
        </DialogBody>
        {footer ? (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={closeDisabled}>
              {closeLabel ?? t('close')}
            </Button>
            {actions}
          </DialogFooter>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
