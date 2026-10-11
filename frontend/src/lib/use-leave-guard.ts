'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'

/* Asks before leaving a page that holds unsaved input (the checkout's payment proof) — the page
   renders a ConfirmDialog from what this returns. While `dirty`:
   - closing or reloading the tab triggers the browser's own "Leave site?" prompt (beforeunload);
   - a click on an in-app link (the sidebar, the breadcrumb — any same-origin <a>) is caught before
     the router sees it (a capture listener on the document) and becomes `pendingHref`;
   - a programmatic leave (the page's Back button) goes through `request(href)`.
   `confirm()` then navigates; `cancel()` stays. New-tab clicks (modifier keys, target=_blank) and
   downloads are left alone. When not dirty, `request()` navigates at once. */

export function useLeaveGuard(dirty: boolean) {
  const router = useRouter()
  const [pendingHref, setPendingHref] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!dirty) return

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
    }
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href]') : null
      if (!anchor || (anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return
      const url = new URL(anchor.href, window.location.href)
      if (url.origin !== window.location.origin) return
      if (url.pathname === window.location.pathname && url.search === window.location.search) return
      event.preventDefault()
      event.stopPropagation()
      setPendingHref(`${url.pathname}${url.search}${url.hash}`)
    }

    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onClick, true)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      document.removeEventListener('click', onClick, true)
    }
  }, [dirty])

  const request = React.useCallback(
    (href: string) => {
      if (dirty) setPendingHref(href)
      else router.push(href)
    },
    [dirty, router],
  )

  const confirm = React.useCallback(() => {
    const href = pendingHref
    setPendingHref(null)
    if (href) router.push(href)
  }, [pendingHref, router])

  const cancel = React.useCallback(() => setPendingHref(null), [])

  return { pendingHref, request, confirm, cancel }
}
