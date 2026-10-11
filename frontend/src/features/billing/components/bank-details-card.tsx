'use client'

import * as React from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardHeading } from '@/components/ui/card'
import { CopyButton } from '@/components/ui/copy-button'
import { BANK_DETAIL_KEYS, type BankDetails } from '@/features/billing/types'

/* The checkout's "Bank Details" panel: the platform's bank-transfer details from the global
   settings (Admin Settings will edit them), in the settings' order — bank name, account name,
   account number, branch, SWIFT / BIC, then the instructions across the full width. Each value
   has a CopyButton; a value that isn't set reads a muted "Not set" with nothing to copy. */

export function BankDetailsCard({ details }: { details: BankDetails }) {
  const t = useTranslations('billing.checkout.bankDetails')

  return (
    <Card>
      <CardHeading divided title={t('title')} />
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 p-card sm:grid-cols-2">
        {BANK_DETAIL_KEYS.map((key) => {
          const value = details[key]
          const label = t(`fields.${key}`)
          return (
            <div key={key} className={key === 'bank_instructions' ? 'sm:col-span-2' : undefined}>
              <dt className="text-body-sm text-muted-foreground">{label}</dt>
              <dd className="mt-0.5 flex items-start justify-between gap-2">
                {value ? (
                  <>
                    <span className="min-w-0 pt-1 text-body font-medium break-words whitespace-pre-line">{value}</span>
                    <CopyButton value={value} label={label} className="shrink-0" />
                  </>
                ) : (
                  <span className="pt-1 text-body text-muted-foreground">{t('notSet')}</span>
                )}
              </dd>
            </div>
          )
        })}
      </dl>
    </Card>
  )
}
