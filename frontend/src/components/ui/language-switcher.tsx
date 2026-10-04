'use client'

import { Check, Globe } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { useLocale, useTranslations } from 'next-intl'
import { cn } from '@/lib/cn'
import { locales, type AppLocale } from '@/i18n/config'

/* The top bar's language button from the dashboard designs (Globe + name + flag), opening
   a design-system DropdownMenu. Static for now: English is the only locale. */
const FLAGS: Record<AppLocale, string> = { en: '🇬🇧' }

export function LanguageSwitcher({ className }: { className?: string }) {
  const t = useTranslations('common')
  const current = useLocale()

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger
        aria-label={t('language')}
        className={cn(
          'inline-flex h-control items-center gap-2 rounded-lg border border-border bg-card px-3 text-body shadow-sm transition-colors',
          'hover:bg-accent focus-visible:border-ring focus-visible:shadow-focus focus-visible:outline-none',
          className,
        )}
      >
        <Globe className="size-icon text-muted-foreground" aria-hidden="true" />
        <span>{t(`languages.${current}`)}</span>
        <span aria-hidden="true" className="text-[15px] leading-none">
          {FLAGS[current]}
        </span>
      </DropdownMenu.Trigger>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-40 rounded-lg border border-border bg-popover p-1 text-popover-foreground shadow-lg"
        >
          <DropdownMenu.RadioGroup value={current}>
            {locales.map((locale) => (
              <DropdownMenu.RadioItem
                key={locale}
                value={locale}
                className="flex h-8.5 cursor-default items-center gap-2.5 rounded-md px-2 text-body outline-none select-none focus:bg-accent"
              >
                <span aria-hidden="true" className="text-[15px] leading-none">
                  {FLAGS[locale]}
                </span>
                <span className="flex-1">{t(`languages.${locale}`)}</span>
                <DropdownMenu.ItemIndicator>
                  <Check className="size-icon text-primary-strong" aria-hidden="true" />
                </DropdownMenu.ItemIndicator>
              </DropdownMenu.RadioItem>
            ))}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  )
}
