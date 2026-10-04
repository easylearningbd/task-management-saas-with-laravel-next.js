'use client'

import * as React from 'react'
import { isAxiosError } from 'axios'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { Toaster } from '@/components/ui/toast'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // Retry network blips, never a 4xx: a 401/403/404/422 will not fix itself.
        retry: (failureCount, error) => {
          const status = isAxiosError(error) ? error.response?.status : undefined
          if (status !== undefined && status >= 400 && status < 500) return false
          return failureCount < 2
        },
      },
    },
  })
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = React.useState(makeQueryClient)

  return (
    <QueryClientProvider client={queryClient}>
      {/* `.dark` on <html>, exactly what the design system's @custom-variant expects. */}
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        {children}
        <Toaster />
      </ThemeProvider>
    </QueryClientProvider>
  )
}
