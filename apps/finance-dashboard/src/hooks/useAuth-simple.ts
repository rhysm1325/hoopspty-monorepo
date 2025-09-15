// Simplified authentication hook that uses AuthProvider

'use client'

import { useAuthContext } from '@/providers/auth-provider'
import type { UserRole, RolePermissions } from '@/types'

export function useAuth() {
  const {
    user,
    permissions,
    isLoading,
    isAuthenticated,
    refreshUser,
    signOut,
  } = useAuthContext()

  const hasPermission = (permission: keyof RolePermissions): boolean => {
    if (!permissions) return false
    return permissions[permission]
  }

  const hasRole = (roles: UserRole | UserRole[]): boolean => {
    if (!user || !user.isActive) return false
    const roleArray = Array.isArray(roles) ? roles : [roles]
    return roleArray.includes(user.role)
  }

  return {
    user,
    isLoading,
    isAuthenticated,
    permissions,
    signOut,
    refreshUser,
    hasPermission,
    hasRole,
  }
}
