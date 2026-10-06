'use client'

import * as React from 'react'
import { Tag } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { DetailsModal, type DetailItem } from '@/components/shared/details-modal'
import { Badge } from '@/components/ui/badge'
import { CodeChip } from '@/components/ui/code-chip'
import { useCoupon } from '@/features/coupons/api'
import { useCouponFormat } from '@/features/coupons/format'
import type { Coupon } from '@/features/coupons/types'

/* The eye icon's read-only view (PAGE SPEC B): the DetailsModal sheet with the coupon's fields —
   name, code (chip), type, discount, min/max spend, coupon limit, user limit, expiry date,
   status (badge) and created at. Header glyph: `Tag`, the Coupons icon (brand-book.md).
   Opens instantly from the row, then refreshes from GET /coupons/{id}. */
export function CouponDetailsModal({ coupon, onOpenChange }: { coupon: Coupon | null; onOpenChange: (open: boolean) => void }) {
  const t = useTranslations('coupons.details')
  const f = useCouponFormat()
  const detail = useCoupon(coupon?.id ?? null, { initialData: coupon ?? undefined })
  const shown = detail.data ?? coupon

  const items = React.useMemo<DetailItem[]>(() => {
    if (!shown) return []
    return [
      { id: 'name', label: t('name'), value: <span className="text-title-row">{shown.name}</span> },
      { id: 'code', label: t('code'), value: <CodeChip>{shown.code}</CodeChip> },
      { id: 'type', label: t('type'), value: shown.type_label },
      { id: 'discount', label: t('discount'), value: <span className="font-mono text-money">{shown.discount_display}</span> },
      { id: 'min_spend', label: t('minSpend'), value: shown.min_spend === null ? null : <span className="font-mono text-money">{f.money(shown.min_spend)}</span> },
      { id: 'max_spend', label: t('maxSpend'), value: shown.max_spend === null ? null : <span className="font-mono text-money">{f.money(shown.max_spend)}</span> },
      { id: 'usage_limit', label: t('couponLimit'), value: shown.usage_limit_display },
      { id: 'per_user_limit', label: t('userLimit'), value: shown.per_user_limit_display },
      {
        id: 'expiry_date',
        label: t('expiryDate'),
        value: shown.expiry_date ? (
          <span className="inline-flex flex-wrap items-center gap-2">
            <time dateTime={shown.expiry_date}>{shown.expiry_date}</time>
            {shown.is_expired ? <Badge tone="danger">{t('expired')}</Badge> : null}
          </span>
        ) : null,
      },
      {
        id: 'status',
        label: t('status'),
        value: <Badge tone={shown.is_active ? 'success' : 'neutral'}>{shown.is_active ? t('active') : t('inactive')}</Badge>,
      },
      {
        id: 'created_at',
        label: t('createdAt'),
        value: shown.created_at ? (
          <time dateTime={shown.created_at}>{f.dateTime(shown.created_at)}</time>
        ) : null,
      },
    ]
  }, [shown, t, f])

  return (
    <DetailsModal
      open={coupon !== null}
      onOpenChange={onOpenChange}
      title={t('title')}
      icon={Tag}
      items={items}
    />
  )
}
