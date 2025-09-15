// Server Actions for authentication operations

'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  createServerSupabaseClient,
  createServiceRoleClient,
} from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/auth'
import {
  canManageRole,
  getDefaultDashboard,
  getRoleInfo,
} from '@/lib/auth/roles'
import { generateInvitationEmail } from '@/lib/email/templates'
import { sendInvitationEmail } from '@/lib/email/service'
import { config } from '@/lib/env'
import type { UserRole, InviteUserData } from '@/types'

/**
 * Server Action to invite a new user
 */
export async function inviteUserAction(formData: FormData) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return { success: false, error: 'You must be logged in to invite users' }
    }

    const email = formData.get('email') as string
    const role = formData.get('role') as UserRole
    const firstName = formData.get('firstName') as string
    const lastName = formData.get('lastName') as string

    if (!email || !role) {
      return { success: false, error: 'Email and role are required' }
    }

    // Validate that current user can assign this role
    if (!canManageRole(currentUser.role, role)) {
      return {
        success: false,
        error: `You cannot assign the ${role} role`,
      }
    }

    const supabase = createServiceRoleClient()

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('email')
      .eq('email', email)
      .single()

    if (existingUser) {
      return {
        success: false,
        error: 'User with this email already exists',
      }
    }

    // Create the user invitation
    const invitationUrl = `${config.auth.url}/auth/signup?token=INVITATION_TOKEN&email=${encodeURIComponent(email)}&role=${role}&first_name=${encodeURIComponent(firstName || '')}&last_name=${encodeURIComponent(lastName || '')}`

    const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
      data: {
        first_name: firstName,
        last_name: lastName,
        role: role,
        invited_by: currentUser.id,
      },
      redirectTo: invitationUrl,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    // Send custom invitation email with role information
    try {
      const inviterName =
        `${currentUser.firstName || ''} ${currentUser.lastName || ''}`.trim() ||
        currentUser.email
      const emailTemplate = generateInvitationEmail({
        recipientEmail: email,
        recipientFirstName: firstName,
        recipientLastName: lastName,
        role: role,
        inviterName,
        inviterRole: currentUser.role,
        invitationUrl,
        companyName: config.business.companyName,
      })

      const emailResult = await sendInvitationEmail(email, emailTemplate)

      if (!emailResult.success) {
        console.error('Failed to send invitation email:', emailResult.error)
        // Continue anyway - user can still be invited via Supabase default email
      }
    } catch (emailError) {
      console.error('Error sending invitation email:', emailError)
      // Continue anyway - core invitation still works
    }

    // Log the invitation in audit log
    await supabase.from('audit_logs').insert({
      user_id: currentUser.id,
      action: 'user_invited',
      details: {
        invited_email: email,
        invited_role: role,
        invited_name: `${firstName} ${lastName}`.trim(),
      },
      timestamp: new Date().toISOString(),
    })

    revalidatePath('/settings')
    return {
      success: true,
      error: null,
      message: `Invitation sent successfully to ${email}`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Invitation failed',
    }
  }
}

/**
 * Server Action to update user role (admin only)
 */
export async function updateUserRoleAction(userId: string, newRole: UserRole) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      return { success: false, error: 'You must be logged in' }
    }

    if (!canManageRole(currentUser.role, newRole)) {
      return {
        success: false,
        error: `You cannot assign the ${newRole} role`,
      }
    }

    const supabase = createServiceRoleClient()

    // Get target user info
    const { data: targetUser, error: fetchError } = await supabase
      .from('profiles')
      .select('email, role, first_name, last_name')
      .eq('id', userId)
      .single()

    if (fetchError || !targetUser) {
      return { success: false, error: 'User not found' }
    }

    // Update the user role
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        role: newRole,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    // Log the role change
    await supabase.from('audit_logs').insert({
      user_id: currentUser.id,
      action: 'role_changed',
      details: {
        target_user_id: userId,
        target_user_email: targetUser.email,
        old_role: targetUser.role,
        new_role: newRole,
      },
      timestamp: new Date().toISOString(),
    })

    revalidatePath('/settings')
    return {
      success: true,
      error: null,
      message: `Role updated successfully for ${targetUser.email}`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Role update failed',
    }
  }
}

/**
 * Server Action to deactivate a user (admin only)
 */
export async function deactivateUserAction(userId: string) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || !['owner', 'finance'].includes(currentUser.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }

    // Cannot deactivate yourself
    if (userId === currentUser.id) {
      return { success: false, error: 'You cannot deactivate your own account' }
    }

    const supabase = createServiceRoleClient()

    // Get target user info
    const { data: targetUser, error: fetchError } = await supabase
      .from('profiles')
      .select('email, role')
      .eq('id', userId)
      .single()

    if (fetchError || !targetUser) {
      return { success: false, error: 'User not found' }
    }

    // Finance cannot deactivate Owner
    if (currentUser.role === 'finance' && targetUser.role === 'owner') {
      return { success: false, error: 'Cannot deactivate owner account' }
    }

    // Deactivate the user
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    // Log the deactivation
    await supabase.from('audit_logs').insert({
      user_id: currentUser.id,
      action: 'user_deactivated',
      details: {
        target_user_id: userId,
        target_user_email: targetUser.email,
        target_user_role: targetUser.role,
      },
      timestamp: new Date().toISOString(),
    })

    revalidatePath('/settings')
    return {
      success: true,
      error: null,
      message: `User ${targetUser.email} has been deactivated`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Deactivation failed',
    }
  }
}

/**
 * Server Action to activate a user (admin only)
 */
export async function activateUserAction(userId: string) {
  try {
    const currentUser = await getCurrentUser()

    if (!currentUser || !['owner', 'finance'].includes(currentUser.role)) {
      return { success: false, error: 'Insufficient permissions' }
    }

    const supabase = createServiceRoleClient()

    // Get target user info
    const { data: targetUser, error: fetchError } = await supabase
      .from('profiles')
      .select('email, role')
      .eq('id', userId)
      .single()

    if (fetchError || !targetUser) {
      return { success: false, error: 'User not found' }
    }

    // Activate the user
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    // Log the activation
    await supabase.from('audit_logs').insert({
      user_id: currentUser.id,
      action: 'user_activated',
      details: {
        target_user_id: userId,
        target_user_email: targetUser.email,
        target_user_role: targetUser.role,
      },
      timestamp: new Date().toISOString(),
    })

    revalidatePath('/settings')
    return {
      success: true,
      error: null,
      message: `User ${targetUser.email} has been activated`,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Activation failed',
    }
  }
}

/**
 * Server Action for user login (with audit logging)
 */
export async function loginAction(formData: FormData) {
  try {
    const email = formData.get('email') as string
    const password = formData.get('password') as string

    if (!email || !password) {
      return { success: false, error: 'Email and password are required' }
    }

    const supabase = createServerSupabaseClient()

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    if (!data.user) {
      return { success: false, error: 'Login failed' }
    }

    // Update last login timestamp and log the login
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile) {
      // Update last login
      await supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', data.user.id)

      // Log the login
      await supabase.from('audit_logs').insert({
        user_id: data.user.id,
        action: 'user_login',
        details: {
          email: data.user.email,
          role: profile.role,
        },
        timestamp: new Date().toISOString(),
      })

      // Redirect to appropriate dashboard
      const defaultDashboard = getDefaultDashboard(profile.role as UserRole)
      redirect(defaultDashboard)
    }

    return { success: true, error: null, user: data.user }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Login failed',
    }
  }
}
