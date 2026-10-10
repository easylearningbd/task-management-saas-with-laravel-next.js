'use client'

import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Paginated } from '@/lib/paginated'
import type { Resource } from '@/features/auth/types'
import { planUsageKeys } from '@/features/plan-usage/api'
import { projectKeys } from '@/features/projects/api'
import type { Media, MediaListParams } from '@/features/media/types'

/* The company's media library (all through the shared axios client):
   GET /api/v1/media (search, 18 a page, newest first) · POST /api/v1/media (one file, multipart)
   DELETE /api/v1/media/{id} · GET /api/v1/media/{id}/file (the authenticated file route — used
   directly as <img src> / a download link, not through axios).
   An upload over the plan's storage allowance answers 422 `storage_limit_reached`; a type or
   size the server refuses answers 422 under `file` — both reach the caller (toApiError).
   Upload / delete → the media lists and plan usage; delete also drops the file from every
   project it was attached to, so every project detail goes stale. */

export const mediaKeys = {
  all: ['media'] as const,
  lists: ['media', 'list'] as const,
  list: (params: MediaListParams) => ['media', 'list', params] as const,
}

const MEDIA = '/api/v1/media'

export function useMediaList(params: MediaListParams, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: mediaKeys.list(params),
    queryFn: async ({ signal }) => {
      const { data } = await api.get<Paginated<Media>>(MEDIA, { params, signal })
      return data
    },
    placeholderData: keepPreviousData,
    enabled: options.enabled ?? true,
  })
}

export type UploadMediaInput = {
  file: File
  /** 0–100 as the bytes go up. */
  onProgress?: (percent: number) => void
  signal?: AbortSignal
}

/** One file per request, so each file gets its own progress and its own error. */
export function useUploadMedia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ file, onProgress, signal }: UploadMediaInput) => {
      const body = new FormData()
      body.append('file', file)
      const { data } = await api.post<Resource<Media>>(MEDIA, body, {
        signal,
        onUploadProgress: (event) => {
          if (onProgress && event.total) onProgress(Math.min(100, (event.loaded / event.total) * 100))
        },
      })
      return data.data
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: mediaKeys.lists }),
        queryClient.invalidateQueries({ queryKey: planUsageKeys.all }),
      ])
    },
  })
}

/** Deletes the file from storage and detaches it from every project. */
export function useDeleteMedia() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`${MEDIA}/${id}`)
      return id
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: mediaKeys.lists }),
        queryClient.invalidateQueries({ queryKey: planUsageKeys.all }),
        queryClient.invalidateQueries({ queryKey: projectKeys.details }),
      ])
    },
  })
}
