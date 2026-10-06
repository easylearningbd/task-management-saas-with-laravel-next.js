import 'server-only'

import { cookies, headers } from 'next/headers'

/* GET from the Laravel API inside a Server Component, as the signed-in user: forwards the
   browser's cookies and sends the SPA origin so Sanctum treats it as a stateful request
   (same approach as lib/session.ts). Used where the server must know the answer before
   rendering — e.g. to call notFound() for a missing record (notFound only works on the server). */

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL

export type ServerApiResult<T> = { status: number; data: T | null }

export async function serverApiGet<T>(path: string): Promise<ServerApiResult<T>> {
  if (!BACKEND_URL) return { status: 0, data: null }

  const cookieHeader = (await cookies()).toString()
  const h = await headers()
  const origin = `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('host')}`

  try {
    const response = await fetch(`${BACKEND_URL}${path}`, {
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        Cookie: cookieHeader,
        Referer: `${origin}/`,
        Origin: origin,
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    })
    if (!response.ok) return { status: response.status, data: null }
    const body = (await response.json()) as { data: T }
    return { status: response.status, data: body.data }
  } catch {
    return { status: 0, data: null }
  }
}
