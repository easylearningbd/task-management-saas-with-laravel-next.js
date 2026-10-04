import { getRequestConfig } from 'next-intl/server'
import { defaultLocale } from '@/i18n/config'

/* English only for now: the language switcher is static until more locales exist.
   When they do, resolve the locale here (e.g. from a cookie) and add messages/<locale>.json. */
export default getRequestConfig(async () => {
  const locale = defaultLocale

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
    timeZone: 'UTC',
  }
})
