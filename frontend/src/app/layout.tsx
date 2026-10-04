import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getTranslations } from 'next-intl/server'
import { Providers } from '@/app/providers'
import './globals.css'

/* globals.css reads `--font-inter` first in its --font-sans stack. */
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('metadata')
  return { title: t('title'), description: t('description') }
}

export default async function RootLayout({ children }: LayoutProps<'/'>) {
  const locale = await getLocale()

  return (
    <html lang={locale} className={inter.variable} suppressHydrationWarning>
      <body>
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
