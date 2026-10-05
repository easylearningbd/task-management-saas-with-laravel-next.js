'use client'

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { authKeys } from '@/features/auth/api'
import type { Resource } from '@/features/auth/types'
import type {
  Profile,
  UpdateAvatarVariables,
  UpdatePasswordPayload,
  UpdateProfilePayload,
} from '@/features/profile/types'

/* Own-profile endpoints (both roles). All calls go through the shared axios client, so CSRF
   and credentials are handled there. Every successful change is written into both the
   profile query and the auth `me` query — the top bar reads `me`, so its name, email and
   avatar update immediately without a refetch or a page reload. */

export const profileKeys = {
  profile: ['profile'] as const,
}

export const profileEndpoints = {
  profile: '/api/v1/profile',
  avatar: '/api/v1/profile/avatar',
  password: '/api/v1/profile/password',
} as const

function storeProfile(queryClient: QueryClient, profile: Profile) {
  queryClient.setQueryData(profileKeys.profile, profile)
  queryClient.setQueryData(authKeys.me, profile)
}

export function useProfile() {
  return useQuery({
    queryKey: profileKeys.profile,
    queryFn: async () => {
      const { data } = await api.get<Resource<Profile>>(profileEndpoints.profile)
      return data.data
    },
  })
}

/** PATCH /api/v1/profile — name + email. */
export function useUpdateProfile() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: UpdateProfilePayload) => {
      const { data } = await api.patch<Resource<Profile>>(profileEndpoints.profile, payload)
      return data.data
    },
    onSuccess: async (profile) => {
      storeProfile(queryClient, profile)
      await queryClient.invalidateQueries({ queryKey: profileKeys.profile })
      await queryClient.invalidateQueries({ queryKey: authKeys.me })
    },
  })
}

/** POST /api/v1/profile/avatar — multipart upload with progress. */
export function useUpdateAvatar() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ file, onProgress }: UpdateAvatarVariables) => {
      const body = new FormData()
      body.append('avatar', file)
      // axios sets the multipart Content-Type (with boundary) itself for FormData.
      const { data } = await api.post<Resource<Profile>>(profileEndpoints.avatar, body, {
        onUploadProgress: (event) => {
          if (onProgress && event.total) onProgress(Math.round((event.loaded / event.total) * 100))
        },
      })
      return data.data
    },
    onSuccess: async (profile) => {
      storeProfile(queryClient, profile)
      await queryClient.invalidateQueries({ queryKey: profileKeys.profile })
      await queryClient.invalidateQueries({ queryKey: authKeys.me })
    },
  })
}

/** PUT /api/v1/profile/password — 204. The resource doesn't change, so there is nothing to
 *  write into the caches; the current session stays signed in (see ProfileService). */
export function useUpdatePassword() {
  return useMutation({
    mutationFn: async (payload: UpdatePasswordPayload) => {
      await api.put(profileEndpoints.password, payload)
    },
  })
}
