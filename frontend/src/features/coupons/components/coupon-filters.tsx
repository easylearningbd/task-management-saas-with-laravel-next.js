'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { DateInput } from '@/components/ui/date-input'
import { Field } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { CouponFilterName } from '@/features/coupons/types'

/* The Coupons filter bar's controls. Inline: "All Types" (Percentage / Flat Amount) and
   "All Status" (Active / Inactive) — filter selects show their own default instead of a
   placeholder (Select.md); Radix forbids "" as a value, so "all" stands for no filter.
   Advanced panel: an Expiry From → Expiry To range of DateInputs with leading Calendar glyphs
   (DateInput.md: the second rejects anything before the first). */

const ALL = 'all'

type Filters = Record<CouponFilterName, string>
type SetFilter = (name: CouponFilterName, value: string) => void

export function CouponInlineFilters({ filters, onChange }: { filters: Filters; onChange: SetFilter }) {
  const t = useTranslations('coupons.list.filters')

  return (
    <>
      <Select value={filters.type || ALL} onValueChange={(value) => onChange('type', value === ALL ? '' : value)}>
        <SelectTrigger className="w-auto" aria-label={t('typeLabel')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t('allTypes')}</SelectItem>
          <SelectItem value="percentage">{t('percentage')}</SelectItem>
          <SelectItem value="flat">{t('flat')}</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filters.status || ALL} onValueChange={(value) => onChange('status', value === ALL ? '' : value)}>
        <SelectTrigger className="w-auto" aria-label={t('statusLabel')}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>{t('allStatus')}</SelectItem>
          <SelectItem value="active">{t('active')}</SelectItem>
          <SelectItem value="inactive">{t('inactive')}</SelectItem>
        </SelectContent>
      </Select>
    </>
  )
}

export function CouponExpiryRange({ filters, onChange }: { filters: Filters; onChange: SetFilter }) {
  const t = useTranslations('coupons.list.filters')
  const fromId = React.useId()
  const toId = React.useId()

  return (
    <>
      <Field className="w-full sm:w-44">
        <Label htmlFor={fromId}>{t('expiryFrom')}</Label>
        <DateInput
          id={fromId}
          iconPosition="leading"
          value={filters.expiry_from}
          max={filters.expiry_to || undefined}
          onChange={(event) => onChange('expiry_from', event.target.value)}
        />
      </Field>
      <Field className="w-full sm:w-44">
        <Label htmlFor={toId}>{t('expiryTo')}</Label>
        <DateInput
          id={toId}
          iconPosition="leading"
          value={filters.expiry_to}
          min={filters.expiry_from || undefined}
          onChange={(event) => onChange('expiry_to', event.target.value)}
        />
      </Field>
    </>
  )
}
