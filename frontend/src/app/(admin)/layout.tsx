import { AppShell } from '@/components/layout/app-shell'
import { requireRole } from '@/features/auth/server'

/* Super Admin area guard (second line of defence behind src/proxy.ts): guests → /admin/login,
   companies → /dashboard. /admin/login lives in the (admin-auth) group, outside this guard. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole('super_admin')

  return <AppShell user={user}>{children}</AppShell>
}
