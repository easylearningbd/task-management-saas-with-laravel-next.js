'use client'

import { isAxiosError } from 'axios'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, resetCsrf } from '@/lib/api'
import type { LoginPayload, RegisterPayload, Resource, User } from '@/features/auth/types'

export const authKeys = {
  me: ['auth', 'me'] as const,
}

export const authEndpoints = {
  me: '/api/v1/me',
  login: '/api/v1/auth/login',
  adminLogin: '/api/v1/admin/auth/login',
  register: '/api/v1/auth/register',
  logout: '/api/v1/auth/logout',
} as const

/** The current user, or `null` when nobody is logged in (a 401 is an answer, not an error). */
async function fetchMe(): Promise<User | null> {
  try {
    const { data } = await api.get<Resource<User>>(authEndpoints.me)
    return data.data
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 401) return null
    throw error
  }
}

export function useMe(options: { initialData?: User; alwaysRefetchOnMount?: boolean } = {}) {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: fetchMe,
    staleTime: 60_000,
    retry: false,
    initialData: options.initialData,
    refetchOnMount: options.alwaysRefetchOnMount ? 'always' : true,
  })
}

function useAuthMutation<TPayload>(endpoint: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: TPayload) => {
      const { data } = await api.post<Resource<User>>(endpoint, payload)
      return data.data
    },
    onSuccess: async (user) => {
      queryClient.setQueryData(authKeys.me, user)
      await queryClient.invalidateQueries({ queryKey: authKeys.me })
    },
  })
}

/** POST /api/v1/auth/login — company accounts only (403 for any other role). */
export function useLogin() {
  return useAuthMutation<LoginPayload>(authEndpoints.login)
}

/** POST /api/v1/admin/auth/login — super admin accounts only (403 for any other role). */
export function useAdminLogin() {
  return useAuthMutation<LoginPayload>(authEndpoints.adminLogin)
}

/** POST /api/v1/auth/register — always creates a company account and logs it in. */
export function useRegister() {
  return useAuthMutation<RegisterPayload>(authEndpoints.register)
}

/** POST /api/v1/auth/logout — both roles. Clears every cached query on success. */
export function useLogout() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      await api.post(authEndpoints.logout)
    },
    onSuccess: () => {
      resetCsrf()
      queryClient.setQueryData(authKeys.me, null)
      queryClient.clear()
    },
  })
}
