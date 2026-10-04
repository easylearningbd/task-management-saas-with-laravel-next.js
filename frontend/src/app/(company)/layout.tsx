import { AppShell } from '@/components/layout/app-shell'
import { requireRole } from '@/features/auth/server'

/* Company area guard (second line of defence behind src/proxy.ts): guests → /login,
   super admins → /admin/dashboard. Runs on the server for every request. */
export default async function CompanyLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('company')

  return <AppShell user={user}>{children}</AppShell>
}
