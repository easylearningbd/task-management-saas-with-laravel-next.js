import type { Resource, User } from '@/features/auth/types'

/* Server-side session lookup, shared by src/proxy.ts and the (company)/(admin) layout guards.

   The Laravel session cookie is encrypted, so the frontend cannot read a role from it —
   the backend's /api/v1/me is the only source of truth. This forwards the browser's
   cookies and sends the SPA origin as Referer/Origin so Sanctum treats the request as a
   stateful (cookie) request, exactly like the browser's own calls. */

export type Session =
  | { status: 'authenticated'; user: User }
  | { status: 'guest' }
  /** Backend down or erroring — callers must not treat this as "logged out". */
  | { status: 'unavailable' }

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

export async function fetchSession(cookieHeader: string, frontendOrigin: string): Promise<Session> {
  if (!BACKEND_URL) return { status: 'unavailable' }
  if (!cookieHeader) return { status: 'guest' }

  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/me`, {
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Cookie: cookieHeader,
        Referer: `${frontendOrigin}/`,
        Origin: frontendOrigin,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })

    if (response.status === 401) return { status: 'guest' }
    if (!response.ok) return { status: 'unavailable' }

    const body = (await response.json()) as Resource<User>
    return { status: 'authenticated', user: body.data }
  } catch {
    return { status: 'unavailable' }
  }
}
