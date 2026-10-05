import type { User } from '@/features/auth/types'

/* Mirrors the backend profile endpoints (both roles, signed-in user only):
   GET|PATCH /api/v1/profile → UserResource · POST /api/v1/profile/avatar → UserResource ·
   PUT /api/v1/profile/password → 204. */

/** GET /api/v1/profile returns the same UserResource as /api/v1/me. */
export type Profile = User

/** PATCH /api/v1/profile — UpdateProfileRequest. */
export interface UpdateProfilePayload {
  name: string
  email: string
}

/** PUT /api/v1/profile/password — UpdatePasswordRequest. */
export interface UpdatePasswordPayload {
  current_password: string
  password: string
  password_confirmation: string
}

/** POST /api/v1/profile/avatar — multipart, field `avatar`. */
export interface UpdateAvatarVariables {
  file: File
  /** 0–100 while the upload is in flight. */
  onProgress?: (percent: number) => void
}
