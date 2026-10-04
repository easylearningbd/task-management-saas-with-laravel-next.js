import type messages from './messages/en.json'
import type { AppLocale } from './i18n/config'

/* Type-checks every translation key against messages/en.json. */
declare module 'next-intl' {
  interface AppConfig {
    Locale: AppLocale
    Messages: typeof messages
  }
}
