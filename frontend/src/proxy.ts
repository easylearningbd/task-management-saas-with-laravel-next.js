import { NextResponse, type NextRequest } from 'next/server'
import { HOME, LOGIN } from '@/lib/routes'
import { fetchSession } from '@/lib/session'

/* Role-based redirects (Next.js 16 `proxy`, formerly `middleware`). UX only — the backend's
   `role:` middleware is the real guard, and the (company)/(admin) layouts re-check server-side.

   - guest on a company page  → /login        guest on an admin page   → /admin/login
   - company on /admin/*       → /dashboard    super admin on a company page → /admin/dashboard
   - signed-in user on /login, /register or /admin/login → their own dashboard

   The role comes from the backend (/api/v1/me): the Laravel session cookie is encrypted, so
   there is nothing in the cookie to read optimistically. If the API cannot answer, the
   request passes through and the layout guard decides. */

type Area = 'public' | 'company-auth' | 'admin-auth' | 'admin' | 'company'

const PUBLIC_EXACT = new Set(['/'])
const PUBLIC_PREFIXES = ['/i/', '/forgot-password', '/reset-password', '/password-reset']
const COMPANY_AUTH = new Set(['/login', '/register'])
const ADMIN_LOGIN = '/admin/login'

function classify(pathname: string): Area {
  if (PUBLIC_EXACT.has(pathname) || PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return 'public'
  if (COMPANY_AUTH.has(pathname)) return 'company-auth'
  if (pathname === ADMIN_LOGIN) return 'admin-auth'
  if (pathname === '/admin' || pathname.startsWith('/admin/')) return 'admin'
  return 'company'
}

export async function proxy(request: NextRequest) {
  const area = classify(request.nextUrl.pathname)
  if (area === 'public') return NextResponse.next()

  const session = await fetchSession(request.headers.get('cookie') ?? '', request.nextUrl.origin)
  if (session.status === 'unavailable') return NextResponse.next()

  const role = session.status === 'authenticated' ? session.user.role : null
  const go = (path: string) => NextResponse.redirect(new URL(path, request.url))

  switch (area) {
    case 'company-auth':
    case 'admin-auth':
      return role ? go(HOME[role]) : NextResponse.next()
    case 'admin':
      if (!role) return go(LOGIN.super_admin)
      return role === 'super_admin' ? NextResponse.next() : go(HOME[role])
    case 'company':
      if (!role) return go(LOGIN.company)
      return role === 'company' ? NextResponse.next() : go(HOME[role])
  }
}
/* No Cache-Control here: Next sets `private, no-cache, no-store, max-age=0, must-revalidate`
   on dynamic (signed-in) pages in production and overrides proxy headers. AppShell's session
   watch covers pages restored from the back/forward cache. */

export const config = {
  // Pages only: skip Next internals, image optimisation and any file with an extension.
  matcher: ['/((?!_next/static|_next/image|_next/data|favicon\\.ico|.*\\..*).*)'],
}
