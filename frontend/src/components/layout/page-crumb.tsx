'use client'

import * as React from 'react'

/* The last breadcrumb step for record pages ("Dashboard › Companies › Acme Inc"). The top bar
   lives in the layout and only knows the pathname, so a page that shows a record hands its
   name up through this context. Trail steps marked `dynamic` (nav.ts) show it; until a page
   provides one (loading, 404) they keep their own label ("Company Details"). */

type PageCrumbState = { label: string | null; setLabel: (label: string | null) => void }

const PageCrumbContext = React.createContext<PageCrumbState | null>(null)

export function PageCrumbProvider({ children }: { children: React.ReactNode }) {
  const [label, setLabel] = React.useState<string | null>(null)
  const value = React.useMemo(() => ({ label, setLabel }), [label])
  return <PageCrumbContext.Provider value={value}>{children}</PageCrumbContext.Provider>
}

/** The label a page provided, or null. */
export function usePageCrumbLabel(): string | null {
  return React.useContext(PageCrumbContext)?.label ?? null
}

/** Shows `label` as the dynamic breadcrumb step while the calling page is mounted. */
export function usePageCrumb(label: string | null) {
  const setLabel = React.useContext(PageCrumbContext)?.setLabel
  // Layout effect: on client navigation the name replaces the fallback before paint.
  React.useLayoutEffect(() => {
    if (!setLabel) return
    setLabel(label)
    return () => setLabel(null)
  }, [label, setLabel])
}
