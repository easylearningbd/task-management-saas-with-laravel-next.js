import type { UserRole } from '@/features/auth/types'

/** Where each role lands after login. */
export const HOME: Record<UserRole, string> = { company: '/dashboard', super_admin: '/admin/dashboard' }

/** Each role's own login page (guests of that area are sent here). */
export const LOGIN: Record<UserRole, string> = { company: '/login', super_admin: '/admin/login' }
