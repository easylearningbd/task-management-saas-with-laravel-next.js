import { getTranslations } from 'next-intl/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { User } from '@/features/auth/types'

/* Milestone 1 dashboard placeholder: proves which account the server-side session resolved to. */
export async function SignedInCard({ user }: { user: User }) {
  const t = await getTranslations('dashboard')
  const tRoles = await getTranslations('roles')

  const rows = [
    { label: t('name'), value: user.name },
    { label: t('email'), value: user.email },
    { label: t('role'), value: tRoles(user.role) },
  ]

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle>{t('signedInAs')}</CardTitle>
        <CardDescription>{t('placeholder')}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="flex flex-col gap-3">
          {rows.map((row) => (
            <div key={row.label} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5">
              <dt className="text-body-sm text-muted-foreground">{row.label}</dt>
              <dd className="text-title-row break-all" data-field={row.label}>
                {row.value}
              </dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}
