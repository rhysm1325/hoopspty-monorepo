// Session management utilities for AUSA Finance Dashboard

import { getSupabaseClient } from '@/lib/supabase/client'

// Safe environment variable access
function getSessionTimeout(): number {
  const timeout = process.env.SESSION_TIMEOUT_MINUTES
  return timeout ? parseInt(timeout, 10) : 480 // 8 hours default
}

export interface SessionInfo {
  isValid: boolean
  expiresAt?: Date
  timeUntilExpiry?: number
  needsRefresh?: boolean
}

/**
 * Get current session information
 */
export async function getSessionInfo(): Promise<SessionInfo> {
  try {
    const supabase = getSupabaseClient()
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error || !session) {
      return { isValid: false }
    }

    const expiresAt = new Date(session.expires_at! * 1000)
    const now = new Date()
    const timeUntilExpiry = expiresAt.getTime() - now.getTime()

    // Consider session needs refresh if expires within 5 minutes
    const needsRefresh = timeUntilExpiry < 5 * 60 * 1000

    return {
      isValid: timeUntilExpiry > 0,
      expiresAt,
      timeUntilExpiry,
      needsRefresh,
    }
  } catch (error) {
    console.error('Error getting session info:', error)
    return { isValid: false }
  }
}

/**
 * Refresh the current session
 */
export async function refreshSession(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.refreshSession()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Session refresh failed',
    }
  }
}

/**
 * Set up automatic session refresh
 */
export function setupSessionRefresh(onSessionExpired?: () => void) {
  const checkAndRefreshSession = async () => {
    const sessionInfo = await getSessionInfo()

    if (!sessionInfo.isValid) {
      // Session expired
      onSessionExpired?.()
      return
    }

    if (sessionInfo.needsRefresh) {
      // Refresh session proactively
      const refreshResult = await refreshSession()
      if (!refreshResult.success) {
        console.error('Failed to refresh session:', refreshResult.error)
        onSessionExpired?.()
      }
    }
  }

  // Check session every minute
  const interval = setInterval(checkAndRefreshSession, 60 * 1000)

  // Initial check
  checkAndRefreshSession()

  // Return cleanup function
  return () => clearInterval(interval)
}

/**
 * Get session timeout warning time (in minutes before expiry)
 */
export function getSessionTimeoutWarning(): number {
  return 10 // Warn 10 minutes before expiry
}

/**
 * Check if session is approaching timeout
 */
export async function isSessionApproachingTimeout(): Promise<boolean> {
  const sessionInfo = await getSessionInfo()
  if (!sessionInfo.isValid || !sessionInfo.timeUntilExpiry) {
    return false
  }

  const warningThreshold = getSessionTimeoutWarning() * 60 * 1000 // Convert to ms
  return sessionInfo.timeUntilExpiry <= warningThreshold
}

/**
 * Format time until session expiry
 */
export function formatTimeUntilExpiry(timeMs: number): string {
  const minutes = Math.floor(timeMs / (60 * 1000))
  const seconds = Math.floor((timeMs % (60 * 1000)) / 1000)

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

/**
 * Session storage utilities for client-side data
 */
export const sessionStorage = {
  set(key: string, value: any): void {
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem(key, JSON.stringify(value))
      } catch (error) {
        console.error('Error setting session storage:', error)
      }
    }
  },

  get<T>(key: string): T | null {
    if (typeof window !== 'undefined') {
      try {
        const item = window.sessionStorage.getItem(key)
        return item ? JSON.parse(item) : null
      } catch (error) {
        console.error('Error getting session storage:', error)
        return null
      }
    }
    return null
  },

  remove(key: string): void {
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.removeItem(key)
      } catch (error) {
        console.error('Error removing session storage:', error)
      }
    }
  },

  clear(): void {
    if (typeof window !== 'undefined') {
      try {
        window.sessionStorage.clear()
      } catch (error) {
        console.error('Error clearing session storage:', error)
      }
    }
  },
}

/**
 * Local storage utilities for persistent client-side data
 */
export const localStorage = {
  set(key: string, value: any): void {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(key, JSON.stringify(value))
      } catch (error) {
        console.error('Error setting local storage:', error)
      }
    }
  },

  get<T>(key: string): T | null {
    if (typeof window !== 'undefined') {
      try {
        const item = window.localStorage.getItem(key)
        return item ? JSON.parse(item) : null
      } catch (error) {
        console.error('Error getting local storage:', error)
        return null
      }
    }
    return null
  },

  remove(key: string): void {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem(key)
      } catch (error) {
        console.error('Error removing local storage:', error)
      }
    }
  },

  clear(): void {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.clear()
      } catch (error) {
        console.error('Error clearing local storage:', error)
      }
    }
  },
}
