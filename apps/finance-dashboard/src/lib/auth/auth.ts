// Authentication utilities for AUSA Finance Dashboard

import type { User as SupabaseUser } from '@supabase/supabase-js'
import { createServerClient } from '@/lib/supabase/server'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { User, UserRole, LoginCredentials, InviteUserData } from '@/types'

/**
 * Get the current authenticated user from server-side
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const supabase = createServerClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    // Get user profile with role information
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return null
    }

    return {
      id: user.id,
      email: user.email || '',
      firstName: profile.first_name,
      lastName: profile.last_name,
      role: profile.role as UserRole,
      isActive: profile.is_active,
      lastLoginAt: profile.last_login_at
        ? new Date(profile.last_login_at)
        : undefined,
      createdAt: new Date(user.created_at),
      updatedAt: new Date(profile.updated_at),
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Get the current authenticated user from client-side (safe for browser)
 */
export async function getCurrentUserClient(): Promise<User | null> {
  try {
    const supabase = getSupabaseClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    if (error || !user) {
      return null
    }

    // Get user profile with role information
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return null
    }

    return {
      id: user.id,
      email: user.email || '',
      firstName: profile.first_name,
      lastName: profile.last_name,
      role: profile.role as UserRole,
      isActive: profile.is_active,
      lastLoginAt: profile.last_login_at
        ? new Date(profile.last_login_at)
        : undefined,
      createdAt: new Date(user.created_at),
      updatedAt: new Date(profile.updated_at),
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Sign in with email and password (client-side)
 */
export async function signInWithPassword(credentials: LoginCredentials) {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    })

    if (error) {
      return { success: false, error: error.message, user: null }
    }

    // Update last login timestamp
    if (data.user) {
      await supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.user.id)
    }

    return { success: true, error: null, user: data.user }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Authentication failed',
      user: null,
    }
  }
}

/**
 * Sign out the current user (client-side)
 */
export async function signOut() {
  try {
    const supabase = getSupabaseClient()
    const { error } = await supabase.auth.signOut()

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, error: null }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sign out failed',
    }
  }
}

/**
 * Invite a new user (admin only, server-side)
 */
export async function inviteUser(
  inviteData: InviteUserData,
  invitedBy: string
) {
  try {
    const supabase = createServerClient()

    // Check if inviter has permission
    const { data: inviterProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', invitedBy)
      .single()

    if (
      !inviterProfile ||
      !['owner', 'finance'].includes(inviterProfile.role)
    ) {
      return {
        success: false,
        error: 'Insufficient permissions to invite users',
        user: null,
      }
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', inviteData.email)
      .single()

    if (existingUser) {
      return {
        success: false,
        error: 'User with this email already exists',
        user: null,
      }
    }

    // Create the user invitation
    const { data, error } = await supabase.auth.admin.inviteUserByEmail(
      inviteData.email,
      {
        data: {
          first_name: inviteData.firstName,
          last_name: inviteData.lastName,
          role: inviteData.role,
          invited_by: invitedBy,
        },
        redirectTo: `${process.env.NEXTAUTH_URL}/auth/signup`,
      }
    )

    if (error) {
      return { success: false, error: error.message, user: null }
    }

    // Log the invitation in audit log
    await supabase.from('audit_logs').insert({
      user_id: invitedBy,
      action: 'user_invited',
      details: {
        invited_email: inviteData.email,
        invited_role: inviteData.role,
      },
      ip_address: null, // Will be populated by middleware
      user_agent: null, // Will be populated by middleware
    })

    return { success: true, error: null, user: data.user }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invitation failed',
      user: null,
    }
  }
}

/**
 * Complete user signup after invitation (client-side)
 */
export async function completeSignup(token: string, password: string) {
  try {
    const supabase = getSupabaseClient()

    // Verify and update password
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: 'invite',
    })

    if (error) {
      return { success: false, error: error.message, user: null }
    }

    // Update password
    const { error: passwordError } = await supabase.auth.updateUser({
      password: password,
    })

    if (passwordError) {
      return { success: false, error: passwordError.message, user: null }
    }

    return { success: true, error: null, user: data.user }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Signup completion failed',
      user: null,
    }
  }
}

/**
 * Get user session (client-side)
 */
export async function getSession() {
  try {
    const supabase = getSupabaseClient()
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession()

    if (error) {
      return { session: null, error: error.message }
    }

    return { session, error: null }
  } catch (error) {
    return {
      session: null,
      error:
        error instanceof Error ? error.message : 'Session retrieval failed',
    }
  }
}

/**
 * Refresh the current session
 */
export async function refreshSession() {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.refreshSession()

    if (error) {
      return { session: null, error: error.message }
    }

    return { session: data.session, error: null }
  } catch (error) {
    return {
      session: null,
      error: error instanceof Error ? error.message : 'Session refresh failed',
    }
  }
}

/**
 * Check if user has required role
 */
export function hasRole(user: User | null, requiredRoles: UserRole[]): boolean {
  if (!user || !user.isActive) return false
  return requiredRoles.includes(user.role)
}

/**
 * Check if user has permission for a specific action
 */
export function hasPermission(
  user: User | null,
  permission: keyof import('@/types').RolePermissions
): boolean {
  if (!user || !user.isActive) return false

  const { ROLE_PERMISSIONS } = require('@/types/auth')
  const rolePermissions = ROLE_PERMISSIONS[user.role]

  return rolePermissions[permission] || false
}

/**
 * Password validation result interface
 */
export interface PasswordValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  strength: 'weak' | 'fair' | 'good' | 'strong'
  score: number // 0-100
}

/**
 * Validate password strength with comprehensive rules
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  let score = 0

  // Basic requirements (errors)
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long')
  } else {
    score += 20
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  } else {
    score += 15
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  } else {
    score += 15
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  } else {
    score += 15
  }

  // Enhanced security checks (warnings for better passwords)
  if (password.length < 12) {
    warnings.push('Consider using at least 12 characters for better security')
  } else {
    score += 10
  }

  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    warnings.push(
      'Consider adding special characters (!@#$%^&*) for stronger security'
    )
  } else {
    score += 15
  }

  // Check for common patterns (security warnings)
  if (/(.)\1{2,}/.test(password)) {
    warnings.push('Avoid repeating characters (aaa, 111)')
  }

  if (/123|abc|qwe|password|admin/i.test(password)) {
    warnings.push('Avoid common patterns and dictionary words')
  }

  if (/^\d+$/.test(password)) {
    errors.push('Password cannot be only numbers')
    score = Math.min(score, 20)
  }

  if (/^[a-zA-Z]+$/.test(password)) {
    warnings.push('Consider adding numbers and special characters')
  }

  // Calculate strength
  let strength: 'weak' | 'fair' | 'good' | 'strong' = 'weak'
  if (score >= 80) strength = 'strong'
  else if (score >= 65) strength = 'good'
  else if (score >= 45) strength = 'fair'

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    strength,
    score: Math.min(100, score),
  }
}

/**
 * Legacy function for backward compatibility
 */
export function validatePasswordBasic(password: string): {
  isValid: boolean
  errors: string[]
} {
  const result = validatePassword(password)
  return {
    isValid: result.isValid,
    errors: result.errors,
  }
}

/**
 * Generate a secure random password
 */
export function generateSecurePassword(length: number = 12): string {
  const charset =
    'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''

  for (let i = 0; i < length; i++) {
    password += charset.charAt(Math.floor(Math.random() * charset.length))
  }

  return password
}
