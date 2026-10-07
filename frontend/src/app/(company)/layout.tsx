import { CompanyShell } from '@/components/layout/company/company-shell'
import { requireRole } from '@/features/auth/server'

/* Company area guard (second line of defence behind src/proxy.ts): guests → /login,
   super admins → /admin/dashboard. Runs on the server for every request.
   The company frame is its own shell (components/layout/company), separate from the
   Super Admin AppShell. */
export default async function CompanyLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('company')

  return <CompanyShell user={user}>{children}</CompanyShell>
}
