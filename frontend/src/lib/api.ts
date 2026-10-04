import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

/* The single HTTP client for the Laravel API (Sanctum SPA cookie auth).
   - withCredentials: send the session + XSRF cookies cross-port (3000 -> 8000).
   - withXSRFToken: axios only copies XSRF-TOKEN into the X-XSRF-TOKEN header for
     same-origin requests unless this is on.
   401/403 are left to callers — no global redirects, so no redirect loops. */

const baseURL = process.env.NEXT_PUBLIC_BACKEND_URL

if (!baseURL) {
  throw new Error('NEXT_PUBLIC_BACKEND_URL is not set. Add it to frontend/.env.local.')
}

export const BACKEND_URL = baseURL

export const api = axios.create({
  baseURL,
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  headers: {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
})

const CSRF_PATH = '/sanctum/csrf-cookie'
const MUTATING = new Set(['post', 'put', 'patch', 'delete'])

let csrfRequest: Promise<void> | null = null

/** Fetches the XSRF-TOKEN cookie once; concurrent callers share the same request. */
export function ensureCsrf(): Promise<void> {
  csrfRequest ??= api
    .get(CSRF_PATH)
    .then(() => undefined)
    .catch((error: unknown) => {
      csrfRequest = null
      throw error
    })
  return csrfRequest
}

/** Forget the cached CSRF cookie (after logout the server issues a new one). */
export function resetCsrf(): void {
  csrfRequest = null
}

api.interceptors.request.use(async (config) => {
  if (MUTATING.has((config.method ?? 'get').toLowerCase()) && config.url !== CSRF_PATH) {
    await ensureCsrf()
  }
  return config
})

type RetriableConfig = InternalAxiosRequestConfig & { _csrfRetried?: boolean }

/* 419 = CSRF token expired (e.g. session lifetime passed while the tab was open).
   Refresh the cookie and retry the request once. Everything else goes to the caller. */
api.interceptors.response.use(undefined, async (error: unknown) => {
  if (error instanceof AxiosError && error.response?.status === 419 && error.config) {
    const config = error.config as RetriableConfig
    if (!config._csrfRetried) {
      config._csrfRetried = true
      resetCsrf()
      await ensureCsrf()
      return api.request(config)
    }
  }
  return Promise.reject(error)
})
