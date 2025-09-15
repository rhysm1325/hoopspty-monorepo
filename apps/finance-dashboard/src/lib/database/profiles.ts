// Database utilities for user profiles

import {
  createServiceRoleClient,
  createServiceRoleClient,
} from '@/lib/supabase/server'
import type {
  Profile,
  ProfileInsert,
  ProfileUpdate,
  UserProfileWithStats,
} from '@/types/database'
import type { UserRole } from '@/types'

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId: string): Promise<{
  profile: Profile | null
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      return { profile: null, error: error.message }
    }

    return { profile: data }
  } catch (error) {
    return {
      profile: null,
      error:
        error instanceof Error ? error.message : 'Failed to get user profile',
    }
  }
}

/**
 * Get user profile with login statistics
 */
export async function getUserProfileWithStats(userId: string): Promise<{
  profile: UserProfileWithStats | null
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('user_profiles_with_stats')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      return { profile: null, error: error.message }
    }

    return { profile: data }
  } catch (error) {
    return {
      profile: null,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to get user profile with stats',
    }
  }
}

/**
 * Get all user profiles (admin only)
 */
export async function getAllUserProfiles(): Promise<{
  profiles: UserProfileWithStats[]
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('user_profiles_with_stats')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return { profiles: [], error: error.message }
    }

    return { profiles: data || [] }
  } catch (error) {
    return {
      profiles: [],
      error:
        error instanceof Error ? error.message : 'Failed to get user profiles',
    }
  }
}

/**
 * Create user profile
 */
export async function createUserProfile(profile: ProfileInsert): Promise<{
  profile: Profile | null
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('profiles')
      .insert(profile)
      .select()
      .single()

    if (error) {
      return { profile: null, error: error.message }
    }

    return { profile: data }
  } catch (error) {
    return {
      profile: null,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create user profile',
    }
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: ProfileUpdate
): Promise<{
  profile: Profile | null
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      return { profile: null, error: error.message }
    }

    return { profile: data }
  } catch (error) {
    return {
      profile: null,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to update user profile',
    }
  }
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(
  userId: string,
  newRole: UserRole,
  updatedBy: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    // Get current profile for audit trail
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('role, email')
      .eq('id', userId)
      .single()

    if (!currentProfile) {
      return { success: false, error: 'User not found' }
    }

    // Update the role
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', userId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    // Log the role change
    await supabase.from('audit_logs').insert({
      user_id: updatedBy,
      action: 'role_changed',
      details: {
        target_user_id: userId,
        target_user_email: currentProfile.email,
        old_role: currentProfile.role,
        new_role: newRole,
      },
    })

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update user role',
    }
  }
}

/**
 * Activate or deactivate user account
 */
export async function setUserActiveStatus(
  userId: string,
  isActive: boolean,
  updatedBy: string
): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    // Get current profile for audit trail
    const { data: currentProfile } = await supabase
      .from('profiles')
      .select('email, is_active')
      .eq('id', userId)
      .single()

    if (!currentProfile) {
      return { success: false, error: 'User not found' }
    }

    if (currentProfile.is_active === isActive) {
      return {
        success: false,
        error: `User is already ${isActive ? 'active' : 'inactive'}`,
      }
    }

    // Update the status
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ is_active: isActive })
      .eq('id', userId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    // Log the status change
    await supabase.from('audit_logs').insert({
      user_id: updatedBy,
      action: isActive ? 'user_activated' : 'user_deactivated',
      details: {
        target_user_id: userId,
        target_user_email: currentProfile.email,
        previous_status: currentProfile.is_active,
        new_status: isActive,
      },
    })

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : 'Failed to update user status',
    }
  }
}

/**
 * Get users by role
 */
export async function getUsersByRole(role: UserRole): Promise<{
  profiles: Profile[]
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', role)
      .eq('is_active', true)
      .order('created_at', { ascending: false })

    if (error) {
      return { profiles: [], error: error.message }
    }

    return { profiles: data || [] }
  } catch (error) {
    return {
      profiles: [],
      error:
        error instanceof Error ? error.message : 'Failed to get users by role',
    }
  }
}

/**
 * Get active user count by role
 */
export async function getActiveUserCountByRole(): Promise<{
  counts: Record<UserRole, number>
  total: number
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('is_active', true)

    if (error) {
      return {
        counts: { owner: 0, finance: 0, operations: 0, sales: 0, marketing: 0 },
        total: 0,
        error: error.message,
      }
    }

    const counts: Record<UserRole, number> = {
      owner: 0,
      finance: 0,
      operations: 0,
      sales: 0,
      marketing: 0,
    }

    data?.forEach(profile => {
      counts[profile.role as UserRole]++
    })

    const total = Object.values(counts).reduce((sum, count) => sum + count, 0)

    return { counts, total }
  } catch (error) {
    return {
      counts: { owner: 0, finance: 0, operations: 0, sales: 0, marketing: 0 },
      total: 0,
      error:
        error instanceof Error ? error.message : 'Failed to get user counts',
    }
  }
}

/**
 * Check if email already exists
 */
export async function checkEmailExists(email: string): Promise<{
  exists: boolean
  userId?: string
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single()

    if (error && error.code !== 'PGRST116') {
      // PGRST116 = no rows returned
      return { exists: false, error: error.message }
    }

    return {
      exists: !!data,
      userId: data?.id,
    }
  } catch (error) {
    return {
      exists: false,
      error: error instanceof Error ? error.message : 'Failed to check email',
    }
  }
}
