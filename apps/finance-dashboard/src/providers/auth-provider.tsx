'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/client'
import { getCurrentUserClient } from '@/lib/auth/auth-client'
import { getRolePermissions, getDefaultDashboard } from '@/lib/auth/roles'
import type { User, RolePermissions } from '@/types'

interface AuthContextType {
  user: User | null
  permissions: RolePermissions | null
  isLoading: boolean
  isAuthenticated: boolean
  refreshUser: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuthContext() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  
  // Safely get Supabase client
  let supabase: ReturnType<typeof getSupabaseClient> | null = null
  try {
    supabase = getSupabaseClient()
  } catch (error) {
    console.error('Supabase client not available:', error)
    console.warn('⚠️  Authentication features will be limited due to missing Supabase configuration.')
  }

  const refreshUser = async () => {
    if (!supabase) {
      setIsLoading(false)
      return
    }
    
    try {
      setIsLoading(true)
      
      // Get basic auth session without triggering RLS issues
      const { data: { session }, error } = await supabase.auth.getSession()
      
      if (error || !session?.user) {
        setUser(null)
        setIsLoading(false)
        return
      }
      
      // Create basic user object from auth session
      const userData: User = {
        id: session.user.id,
        email: session.user.email || '',
        firstName: session.user.user_metadata?.first_name || null,
        lastName: session.user.user_metadata?.last_name || null,
        role: session.user.user_metadata?.role || 'owner',
        isActive: true,
        createdAt: new Date(session.user.created_at || new Date()),
        updatedAt: new Date(session.user.updated_at || new Date()),
      }
      
      console.log('Auth provider loaded user:', userData)
      setUser(userData)
    } catch (error) {
      console.error('Error refreshing user:', error)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    if (!supabase) {
      setUser(null)
      router.push('/login')
      return
    }
    
    try {
      setIsLoading(true)

      // Log the sign out
      if (user) {
        try {
          await supabase.from('audit_logs').insert({
            user_id: user.id,
            action: 'user_logout',
            details: {
              email: user.email,
              role: user.role,
            },
            timestamp: new Date().toISOString(),
          })
        } catch (auditError) {
          console.warn('Failed to log sign out:', auditError)
        }
      }

      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
      }

      setUser(null)
      router.push('/login')
      router.refresh()
    } catch (error) {
      console.error('Error during sign out:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Set up auth state listener
  useEffect(() => {
    if (!supabase) {
      setIsLoading(false)
      return
    }
    
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
  }, [supabase])

  // Auto-redirect based on authentication state
  useEffect(() => {
    if (!isLoading && typeof window !== 'undefined') {
      try {
        const currentPath = window.location.pathname
        const publicPaths = ['/login', '/signup', '/invite']
        const isPublicPath = publicPaths.includes(currentPath)

        if (!user && !isPublicPath) {
          // Redirect unauthenticated users to login
          router.push(`/login?redirect=${encodeURIComponent(currentPath)}`)
        } else if (user && isPublicPath) {
          // Redirect authenticated users away from auth pages
          try {
            const defaultDashboard = getDefaultDashboard(user.role)
            router.push(defaultDashboard)
          } catch (error) {
            console.warn('Error getting default dashboard:', error)
            router.push('/')
          }
        }
      } catch (error) {
        console.warn('Error in auto-redirect:', error)
      }
    }
  }, [user, isLoading, router])

  const permissions = user ? getRolePermissions(user.role) : null
  const isAuthenticated = !!user && user.isActive

  return (
    <AuthContext.Provider
      value={{
        user,
        permissions,
        isLoading,
        isAuthenticated,
        refreshUser,
        signOut: handleSignOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
