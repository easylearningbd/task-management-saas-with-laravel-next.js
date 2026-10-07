'use client'

import * as React from 'react'

const subscribe = () => () => {}

/**
 * false during the server render and hydration, true after. Gate anything that depends on
 * the viewer's clock or time zone (relative dates, local times) so the server's guess never
 * mismatches the browser's markup.
 */
export function useHydrated(): boolean {
  return React.useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  )
}
