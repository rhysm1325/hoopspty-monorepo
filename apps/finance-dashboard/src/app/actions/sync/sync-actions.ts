/**
 * Server Actions for Xero Data Synchronization
 * 
 * These actions provide secure server-side operations for managing
 * Xero data synchronization. All actions include proper authentication
 * and role-based access control.
 */

'use server'

import { createServerClient } from '@/lib/supabase/server'
import { XeroSync } from '@/lib/xero/sync'
import { revalidatePath } from 'next/cache'
import type { SyncResult, EntitySyncResult } from '@/lib/xero/sync'

// Action result interface
interface ActionResult<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

/**
 * Trigger full incremental sync for all entities
 */
export async function triggerFullSync(
  tenantId?: string
): Promise<ActionResult<SyncResult>> {
  try {
    const supabase = createServerClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }

    // Check user permissions
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return {
        success: false,
        error: 'User profile not found'
      }
    }

    if (!profile.is_active) {
      return {
        success: false,
        error: 'User account is inactive'
      }
    }

    // Only Finance and Owner roles can trigger sync
    if (!['owner', 'finance'].includes(profile.role)) {
      return {
        success: false,
        error: 'Insufficient permissions. Finance or Owner role required.'
      }
    }

    // Check if there's already a sync running
    const { data: runningSessions } = await supabase
      .from('sync_sessions')
      .select('id, started_at')
      .eq('status', 'running')
      .gte('started_at', new Date(Date.now() - 30 * 60 * 1000).toISOString()) // Last 30 minutes

    if (runningSessions && runningSessions.length > 0) {
      return {
        success: false,
        error: 'A sync operation is already in progress. Please wait for it to complete.'
      }
    }

    // Trigger the sync
    const result = await XeroSync.performFullSync(user.id, tenantId, 'manual')

    // Log the sync attempt
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'sync_initiated',
        details: {
          action: 'full_sync_triggered',
          tenant_id: tenantId,
          session_id: result.sessionId,
          success: result.success,
          entities_processed: result.entitiesProcessed,
          total_records: result.totalRecordsProcessed,
          duration_seconds: Math.floor(result.totalDuration / 1000)
        },
        ip_address: '127.0.0.1', // Server action
        user_agent: 'Server Action'
      })

    // Revalidate relevant pages
    revalidatePath('/sync')
    revalidatePath('/settings')
    revalidatePath('/(dashboard)', 'layout')

    return {
      success: result.success,
      data: result,
      message: result.success 
        ? `Sync completed successfully. Processed ${result.totalRecordsProcessed} records across ${result.entitiesProcessed} entities.`
        : `Sync completed with ${result.errors.length} errors. Check the sync logs for details.`
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown sync error'
    
    return {
      success: false,
      error: `Failed to trigger sync: ${errorMessage}`
    }
  }
}

/**
 * Trigger sync for specific entities
 */
export async function triggerEntitySync(
  entityTypes: string[],
  tenantId?: string,
  forceFullSync = false
): Promise<ActionResult<SyncResult>> {
  try {
    const supabase = createServerClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }

    // Check user permissions
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return {
        success: false,
        error: 'User profile not found'
      }
    }

    if (!profile.is_active) {
      return {
        success: false,
        error: 'User account is inactive'
      }
    }

    if (!['owner', 'finance'].includes(profile.role)) {
      return {
        success: false,
        error: 'Insufficient permissions. Finance or Owner role required.'
      }
    }

    // Validate entity types
    const validEntityTypes = [
      'accounts', 'contacts', 'invoices', 'payments', 'credit_notes',
      'items', 'bank_accounts', 'bank_transactions', 'manual_journals', 
      'tracking_categories'
    ]

    const invalidTypes = entityTypes.filter(type => !validEntityTypes.includes(type))
    if (invalidTypes.length > 0) {
      return {
        success: false,
        error: `Invalid entity types: ${invalidTypes.join(', ')}`
      }
    }

    // Trigger the sync
    const result = await XeroSync.syncSpecificEntities(
      entityTypes, 
      user.id, 
      tenantId, 
      forceFullSync
    )

    // Log the sync attempt
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'sync_initiated',
        details: {
          action: 'entity_sync_triggered',
          entity_types: entityTypes,
          tenant_id: tenantId,
          force_full_sync: forceFullSync,
          session_id: result.sessionId,
          success: result.success,
          entities_processed: result.entitiesProcessed,
          total_records: result.totalRecordsProcessed
        },
        ip_address: '127.0.0.1',
        user_agent: 'Server Action'
      })

    // Revalidate relevant pages
    revalidatePath('/sync')
    revalidatePath('/settings')
    revalidatePath('/(dashboard)', 'layout')

    return {
      success: result.success,
      data: result,
      message: result.success 
        ? `Entity sync completed successfully. Processed ${result.totalRecordsProcessed} records.`
        : `Entity sync completed with ${result.errors.length} errors.`
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown sync error'
    
    return {
      success: false,
      error: `Failed to trigger entity sync: ${errorMessage}`
    }
  }
}

/**
 * Get sync status and recent history
 */
export async function getSyncStatus(): Promise<ActionResult<{
  currentSession?: any
  recentSessions: any[]
  entityStatus: any[]
  lastSuccessfulSync?: Date
  nextScheduledSync?: Date
}>> {
  try {
    const supabase = createServerClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }

    // Get current running session
    const { data: currentSession } = await supabase
      .from('sync_sessions')
      .select(`
        id,
        session_type,
        sync_scope,
        target_entities,
        status,
        started_at,
        total_records_processed,
        total_api_calls,
        success_rate,
        xero_tenant_id
      `)
      .eq('status', 'running')
      .order('started_at', { ascending: false })
      .limit(1)
      .single()

    // Get recent sessions (last 10)
    const { data: recentSessions } = await supabase
      .from('sync_sessions')
      .select(`
        id,
        session_type,
        sync_scope,
        target_entities,
        status,
        started_at,
        completed_at,
        total_duration_seconds,
        total_records_processed,
        total_api_calls,
        success_rate,
        xero_tenant_id
      `)
      .order('started_at', { ascending: false })
      .limit(10)

    // Get entity status from sync checkpoints
    const { data: entityStatus } = await supabase
      .from('sync_status_dashboard')
      .select('*')
      .order('entity_type')

    // Calculate next scheduled sync (03:30 Sydney time)
    const now = new Date()
    const nextSync = new Date()
    nextSync.setHours(3, 30, 0, 0)
    
    // If it's past 03:30 today, schedule for tomorrow
    if (now.getHours() > 3 || (now.getHours() === 3 && now.getMinutes() >= 30)) {
      nextSync.setDate(nextSync.getDate() + 1)
    }

    // Find last successful sync
    const lastSuccessful = recentSessions?.find(session => 
      session.status === 'completed' && session.success_rate === 100
    )

    return {
      success: true,
      data: {
        currentSession: currentSession || undefined,
        recentSessions: recentSessions || [],
        entityStatus: entityStatus || [],
        lastSuccessfulSync: lastSuccessful ? new Date(lastSuccessful.completed_at) : undefined,
        nextScheduledSync: nextSync
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return {
      success: false,
      error: `Failed to get sync status: ${errorMessage}`
    }
  }
}

/**
 * Get detailed sync logs for a session
 */
export async function getSyncSessionLogs(
  sessionId: string
): Promise<ActionResult<{
  session: any
  logs: any[]
}>> {
  try {
    const supabase = createServerClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }

    // Get session details
    const { data: session, error: sessionError } = await supabase
      .from('sync_sessions')
      .select(`
        *,
        profiles!sync_sessions_initiated_by_fkey (
          email,
          first_name,
          last_name
        )
      `)
      .eq('id', sessionId)
      .single()

    if (sessionError) {
      return {
        success: false,
        error: 'Sync session not found'
      }
    }

    // Get logs for this session
    const { data: logs, error: logsError } = await supabase
      .from('sync_logs')
      .select('*')
      .eq('sync_session_id', sessionId)
      .order('started_at')

    if (logsError) {
      return {
        success: false,
        error: 'Failed to fetch sync logs'
      }
    }

    return {
      success: true,
      data: {
        session,
        logs: logs || []
      }
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return {
      success: false,
      error: `Failed to get sync logs: ${errorMessage}`
    }
  }
}

/**
 * Cancel running sync session
 */
export async function cancelSyncSession(
  sessionId: string
): Promise<ActionResult<void>> {
  try {
    const supabase = createServerClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }

    // Check user permissions
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return {
        success: false,
        error: 'User profile not found'
      }
    }

    if (!['owner', 'finance'].includes(profile.role)) {
      return {
        success: false,
        error: 'Insufficient permissions. Finance or Owner role required.'
      }
    }

    // Update session status to cancelled
    const { error: updateError } = await supabase
      .from('sync_sessions')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString()
      })
      .eq('id', sessionId)
      .eq('status', 'running') // Only cancel if it's running

    if (updateError) {
      return {
        success: false,
        error: 'Failed to cancel sync session'
      }
    }

    // Log the cancellation
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'sync_initiated',
        details: {
          action: 'sync_cancelled',
          session_id: sessionId
        },
        ip_address: '127.0.0.1',
        user_agent: 'Server Action'
      })

    revalidatePath('/sync')

    return {
      success: true,
      message: 'Sync session cancelled successfully'
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return {
      success: false,
      error: `Failed to cancel sync: ${errorMessage}`
    }
  }
}

/**
 * Reset sync checkpoint for entity (force full sync on next run)
 */
export async function resetSyncCheckpoint(
  entityType: string
): Promise<ActionResult<void>> {
  try {
    const supabase = createServerClient()

    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return {
        success: false,
        error: 'Authentication required'
      }
    }

    // Check user permissions (Owner only for checkpoint reset)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, is_active')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return {
        success: false,
        error: 'User profile not found'
      }
    }

    if (profile.role !== 'owner') {
      return {
        success: false,
        error: 'Insufficient permissions. Owner role required for checkpoint reset.'
      }
    }

    // Reset the checkpoint
    const { error: resetError } = await supabase
      .from('sync_checkpoints')
      .update({
        last_updated_utc: new Date('1900-01-01').toISOString(),
        last_successful_sync_at: null,
        sync_status: 'idle',
        error_message: null,
        error_count: 0,
        updated_at: new Date().toISOString()
      })
      .eq('entity_type', entityType)

    if (resetError) {
      return {
        success: false,
        error: 'Failed to reset sync checkpoint'
      }
    }

    // Log the reset
    await supabase
      .from('audit_logs')
      .insert({
        user_id: user.id,
        action: 'settings_updated',
        details: {
          action: 'sync_checkpoint_reset',
          entity_type: entityType
        },
        ip_address: '127.0.0.1',
        user_agent: 'Server Action'
      })

    revalidatePath('/sync')
    revalidatePath('/settings')

    return {
      success: true,
      message: `Sync checkpoint reset for ${entityType}. Next sync will be a full sync.`
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    return {
      success: false,
      error: `Failed to reset checkpoint: ${errorMessage}`
    }
  }
}
