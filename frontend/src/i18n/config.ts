/* Shared by server (i18n/request.ts) and client (LanguageSwitcher) code — keep it import-free. */
export const locales = ['en'] as const
export type AppLocale = (typeof locales)[number]
export const defaultLocale: AppLocale = 'en'
