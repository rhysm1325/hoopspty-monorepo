// Authentication hook for AUSA Finance Dashboard

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { getSession, signOut } from '@/lib/auth/auth-client'
import { getRolePermissions, getDefaultDashboard } from '@/lib/auth/roles'
import type { User, UserRole, RolePermissions } from '@/types'

interface UseAuthReturn {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  permissions: RolePermissions | null
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
  hasPermission: (permission: keyof RolePermissions) => boolean
  hasRole: (roles: UserRole | UserRole[]) => boolean
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const supabase = getSupabaseClient()

  const refreshUser = useCallback(async () => {
    try {
      const { session } = await getSession()

      if (!session?.user) {
        setUser(null)
        setIsLoading(false)
        return
      }

      // Get user profile with role information
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (error || !profile) {
        console.error('Error fetching user profile:', error)
        setUser(null)
        setIsLoading(false)
        return
      }

      const userData: User = {
        id: session.user.id,
        email: session.user.email || '',
        firstName: profile.first_name,
        lastName: profile.last_name,
        role: profile.role as UserRole,
        isActive: profile.is_active,
        lastLoginAt: profile.last_login_at
          ? new Date(profile.last_login_at)
          : undefined,
        createdAt: new Date(session.user.created_at),
        updatedAt: new Date(profile.updated_at),
      }

      setUser(userData)
    } catch (error) {
      console.error('Error refreshing user:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  const handleSignOut = useCallback(async () => {
    try {
      setIsLoading(true)
      await signOut()
      setUser(null)
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Error signing out:', error)
    } finally {
      setIsLoading(false)
    }
  }, [router])

  const hasPermission = useCallback(
    (permission: keyof RolePermissions): boolean => {
      if (!user || !user.isActive) return false
      const permissions = getRolePermissions(user.role)
      return permissions[permission]
    },
    [user]
  )

  const hasRole = useCallback(
    (roles: UserRole | UserRole[]): boolean => {
      if (!user || !user.isActive) return false
      const roleArray = Array.isArray(roles) ? roles : [roles]
      return roleArray.includes(user.role)
    },
    [user]
  )

  // Set up auth state listener
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await refreshUser()
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
        setIsLoading(false)
      }
    })

    // Initial user load
    refreshUser()

    return () => {
      subscription.unsubscribe()
    }
  }, [refreshUser, supabase.auth])

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isLoading && !user) {
      const currentPath = window.location.pathname
      const publicPaths = ['/login', '/signup', '/invite']

      if (!publicPaths.includes(currentPath)) {
        router.push(`/login?redirect=${encodeURIComponent(currentPath)}`)
      }
    }
  }, [user, isLoading, router])

  // Redirect authenticated users to appropriate dashboard
  useEffect(() => {
    if (!isLoading && user) {
      const currentPath = window.location.pathname
      const authPaths = ['/login', '/signup']

      if (authPaths.includes(currentPath)) {
        const defaultDashboard = getDefaultDashboard(user.role)
        router.push(defaultDashboard)
      }
    }
  }, [user, isLoading, router])

  const permissions = user ? getRolePermissions(user.role) : null

  return {
    user,
    isLoading,
    isAuthenticated: !!user && user.isActive,
    permissions,
    signOut: handleSignOut,
    refreshUser,
    hasPermission,
    hasRole,
  }
}
