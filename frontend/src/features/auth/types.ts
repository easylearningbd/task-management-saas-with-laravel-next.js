/* Mirrors backend App\Http\Resources\UserResource. */

export type UserRole = 'super_admin' | 'company'

export type UserStatus = 'active' | 'inactive'

export interface User {
  id: number
  name: string
  email: string
  role: UserRole
  avatar: string | null
  status: UserStatus
  /** A super admin is viewing as this account ("Login as company"). */
  is_impersonating: boolean
  /** That admin, while `is_impersonating`. */
  impersonator: { name: string; email: string } | null
}

/** Laravel API Resource envelope. */
export interface Resource<T> {
  data: T
}

export interface LoginPayload {
  email: string
  password: string
  remember?: boolean
}

export interface RegisterPayload {
  name: string
  email: string
  password: string
  password_confirmation: string
}
