// Route protection utilities for Server Components and Server Actions

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/auth'
import { canAccessDashboard, hasRole } from '@/lib/auth/roles'
import type { UserRole } from '@/types'

/**
 * Protect a route and ensure user has required permissions
 */
export async function protectRoute(
  requiredRoles?: UserRole[],
  requiredDashboard?: string
): Promise<NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>> {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  if (!user.isActive) {
    redirect('/login?error=account_disabled')
  }

  // Check role requirements
  if (requiredRoles && !requiredRoles.includes(user.role)) {
    redirect('/?error=insufficient_permissions')
  }

  // Check dashboard access
  if (requiredDashboard && !canAccessDashboard(user.role, requiredDashboard)) {
    redirect('/?error=insufficient_permissions')
  }

  return user
}

/**
 * Protect an admin route (Owner and Finance only)
 */
export async function protectAdminRoute(): Promise<
  NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>
> {
  return protectRoute(['owner', 'finance'])
}

/**
 * Protect a financial route (Owner, Finance, and specific roles)
 */
export async function protectFinancialRoute(
  additionalRoles: UserRole[] = []
): Promise<NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>> {
  const allowedRoles: UserRole[] = ['owner', 'finance', ...additionalRoles]
  return protectRoute(allowedRoles)
}

/**
 * Get user with permission validation (non-redirecting)
 */
export async function getUserWithPermissions(
  requiredRoles?: UserRole[],
  requiredDashboard?: string
): Promise<{
  user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> | null
  error?: string
}> {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return { user: null, error: 'Authentication required' }
    }

    if (!user.isActive) {
      return { user: null, error: 'Account is disabled' }
    }

    // Check role requirements
    if (requiredRoles && !requiredRoles.includes(user.role)) {
      return { user: null, error: 'Insufficient permissions' }
    }

    // Check dashboard access
    if (
      requiredDashboard &&
      !canAccessDashboard(user.role, requiredDashboard)
    ) {
      return { user: null, error: 'Dashboard access denied' }
    }

    return { user, error: undefined }
  } catch (error) {
    return {
      user: null,
      error: error instanceof Error ? error.message : 'Authentication error',
    }
  }
}

/**
 * Middleware helper to extract user context from headers
 */
export function getUserContextFromHeaders(headers: Headers): {
  userId?: string
  userRole?: UserRole
  userEmail?: string
  clientIP?: string
} {
  return {
    userId: headers.get('x-user-id') || undefined,
    userRole: (headers.get('x-user-role') as UserRole) || undefined,
    userEmail: headers.get('x-user-email') || undefined,
    clientIP: headers.get('x-client-ip') || undefined,
  }
}

/**
 * Validate CSRF token for state-changing operations
 */
export function validateCSRFToken(request: Request): boolean {
  const token = request.headers.get('x-csrf-token')
  const origin = request.headers.get('origin')
  const host = request.headers.get('host')

  // For same-origin requests, validate origin matches host
  if (origin && host) {
    const originHost = new URL(origin).host
    return originHost === host
  }

  // For requests with CSRF token, validate token
  if (token) {
    // In production, implement proper CSRF token validation
    // For now, just check that token exists
    return token.length > 0
  }

  // For GET requests, allow without CSRF token
  return request.method === 'GET'
}

/**
 * Create audit log entry for route access
 */
export async function logRouteAccess(
  userId: string,
  route: string,
  method: string,
  success: boolean,
  details?: Record<string, unknown>
) {
  try {
    const { createServiceRoleClient } = await import('@/lib/supabase/server')
    const supabase = createServiceRoleClient()

    await supabase.from('audit_logs').insert({
      user_id: userId,
      action: success ? 'route_accessed' : 'route_access_denied',
      details: {
        route,
        method,
        success,
        ...details,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error logging route access:', error)
  }
}
