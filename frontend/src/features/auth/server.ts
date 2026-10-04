import 'server-only'

import { cache } from 'react'
import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { HOME, LOGIN } from '@/lib/routes'
import { fetchSession } from '@/lib/session'
import type { User, UserRole } from '@/features/auth/types'

/** The current request's session — one backend call per render, however many callers. */
export const getSession = cache(async () => {
  const cookieHeader = (await cookies()).toString()
  const h = await headers()
  const origin = `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`
  return fetchSession(cookieHeader, origin)
})

/**
 * Server-side guard for a role's layout — the second line of defence behind src/proxy.ts.
 * Guests go to that role's login page; the other role goes to its own dashboard.
 */
export async function requireRole(role: UserRole): Promise<User> {
  const session = await getSession()

  if (session.status === 'unavailable') {
    throw new Error('Could not verify the session: the API is unavailable.')
  }
  if (session.status === 'guest') {
    redirect(LOGIN[role])
  }
  if (session.user.role !== role) {
    redirect(HOME[session.user.role])
  }
  return session.user
}
