// Client-side authentication utilities for AUSA Finance Dashboard

import type { User as SupabaseUser } from '@supabase/supabase-js'
import { getSupabaseClient } from '@/lib/supabase/client'
import type { User, UserRole, LoginCredentials } from '@/types'

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

    // For now, create a basic user object without profile data to avoid RLS issues
    // The profile data will be loaded separately once the user is authenticated
    console.log('Creating basic user object for:', user.id)
    
    return {
      id: user.id,
      email: user.email || '',
      firstName: user.user_metadata?.first_name || null,
      lastName: user.user_metadata?.last_name || null,
      role: user.user_metadata?.role || 'owner', // Default to owner for now
      isActive: true,
      createdAt: new Date(user.created_at || new Date()),
      updatedAt: new Date(user.updated_at || new Date()),
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

    // Note: last_login_at timestamp will be updated by the auth provider
    // after the user profile is loaded with proper permissions

    return { success: true, error: null, user: data.user }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Login failed'
    return { success: false, error: message, user: null }
  }
}

/**
 * Password validation function
 */
export function validatePassword(password: string) {
  const errors: string[] = []
  
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long')
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter')
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter')
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number')
  }
  
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character')
  }

  return {
    isValid: errors.length === 0,
    errors,
    strength: errors.length === 0 ? 'strong' : errors.length <= 2 ? 'medium' : 'weak'
  }
}

/**
 * Get current session (client-side)
 */
export async function getSession() {
  try {
    const supabase = getSupabaseClient()
    const { data, error } = await supabase.auth.getSession()
    
    if (error) {
      return { session: null, error: error.message }
    }
    
    return { session: data.session, error: null }
  } catch (error) {
    return { session: null, error: error instanceof Error ? error.message : 'Session error' }
  }
}

/**
 * Sign out user (client-side)
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
    return { success: false, error: error instanceof Error ? error.message : 'Sign out failed' }
  }
}

/**
 * Complete user signup with invitation token (client-side)
 */
export async function completeSignup(token: string, password: string) {
  try {
    const supabase = getSupabaseClient()
    
    // Verify the token first
    const { data: tokenData, error: tokenError } = await supabase
      .from('user_invitations')
      .select('*')
      .eq('token', token)
      .eq('status', 'pending')
      .single()

    if (tokenError || !tokenData) {
      return { success: false, error: 'Invalid or expired invitation token' }
    }

    // Check if token is expired
    if (new Date(tokenData.expires_at) < new Date()) {
      return { success: false, error: 'Invitation token has expired' }
    }

    // Create the user account
    const { data, error } = await supabase.auth.signUp({
      email: tokenData.email,
      password: password,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    if (data.user) {
      // Update the user profile with invitation data
      await supabase
        .from('profiles')
        .update({
          first_name: tokenData.first_name,
          last_name: tokenData.last_name,
          role: tokenData.role,
          is_active: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.user.id)

      // Mark invitation as completed
      await supabase
        .from('user_invitations')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
        })
        .eq('token', token)
    }

    return { success: true, error: null, user: data.user }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Signup failed'
    return { success: false, error: message }
  }
}
