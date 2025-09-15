// Audit logging system for AUSA Finance Dashboard

import { createServiceRoleClient } from '@/lib/supabase/server'
import { getClientIP } from '@/lib/auth/rate-limit'
import type { AuditAction, AuditLog } from '@/types'

export interface AuditLogEntry {
  userId: string
  action: AuditAction
  details?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
  timestamp?: Date
}

export interface AuditLogFilter {
  userId?: string
  action?: AuditAction
  startDate?: Date
  endDate?: Date
  ipAddress?: string
  limit?: number
  offset?: number
}

/**
 * Log an audit event
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  try {
    const supabase = createServiceRoleClient()

    await supabase.from('audit_logs').insert({
      user_id: entry.userId,
      action: entry.action,
      details: entry.details || {},
      ip_address: entry.ipAddress,
      user_agent: entry.userAgent,
      timestamp: (entry.timestamp || new Date()).toISOString(),
    })
  } catch (error) {
    console.error('Error logging audit event:', error)
    // Don't throw - audit logging shouldn't break the main flow
  }
}

/**
 * Log authentication events
 */
export const auditAuth = {
  async login(userId: string, email: string, role: string, request?: Request) {
    await logAuditEvent({
      userId,
      action: 'user_login',
      details: {
        email,
        role,
        loginMethod: 'email_password',
      },
      ipAddress: request ? getClientIP(request) : undefined,
      userAgent: request?.headers.get('user-agent') || undefined,
    })
  },

  async logout(userId: string, email: string, role: string, request?: Request) {
    await logAuditEvent({
      userId,
      action: 'user_logout',
      details: {
        email,
        role,
        logoutType: 'manual',
      },
      ipAddress: request ? getClientIP(request) : undefined,
      userAgent: request?.headers.get('user-agent') || undefined,
    })
  },

  async sessionExpired(userId: string, email: string, role: string) {
    await logAuditEvent({
      userId,
      action: 'user_logout',
      details: {
        email,
        role,
        logoutType: 'session_expired',
      },
    })
  },

  async failedLogin(email: string, reason: string, request?: Request) {
    await logAuditEvent({
      userId: 'anonymous',
      action: 'user_login',
      details: {
        email,
        success: false,
        reason,
      },
      ipAddress: request ? getClientIP(request) : undefined,
      userAgent: request?.headers.get('user-agent') || undefined,
    })
  },
}

/**
 * Log user management events
 */
export const auditUser = {
  async invited(
    inviterId: string,
    invitedEmail: string,
    role: string,
    request?: Request
  ) {
    await logAuditEvent({
      userId: inviterId,
      action: 'user_invited',
      details: {
        invitedEmail,
        invitedRole: role,
      },
      ipAddress: request ? getClientIP(request) : undefined,
      userAgent: request?.headers.get('user-agent') || undefined,
    })
  },

  async roleChanged(
    changerId: string,
    targetUserId: string,
    targetEmail: string,
    oldRole: string,
    newRole: string,
    request?: Request
  ) {
    await logAuditEvent({
      userId: changerId,
      action: 'role_changed',
      details: {
        targetUserId,
        targetEmail,
        oldRole,
        newRole,
      },
      ipAddress: request ? getClientIP(request) : undefined,
      userAgent: request?.headers.get('user-agent') || undefined,
    })
  },

  async activated(
    activatorId: string,
    targetUserId: string,
    targetEmail: string,
    request?: Request
  ) {
    await logAuditEvent({
      userId: activatorId,
      action: 'user_activated',
      details: {
        targetUserId,
        targetEmail,
      },
      ipAddress: request ? getClientIP(request) : undefined,
      userAgent: request?.headers.get('user-agent') || undefined,
    })
  },

  async deactivated(
    deactivatorId: string,
    targetUserId: string,
    targetEmail: string,
    request?: Request
  ) {
    await logAuditEvent({
      userId: deactivatorId,
      action: 'user_deactivated',
      details: {
        targetUserId,
        targetEmail,
      },
      ipAddress: request ? getClientIP(request) : undefined,
      userAgent: request?.headers.get('user-agent') || undefined,
    })
  },
}

/**
 * Log system configuration events
 */
export const auditConfig = {
  async settingsUpdated(
    userId: string,
    settingType: string,
    changes: Record<string, unknown>,
    request?: Request
  ) {
    await logAuditEvent({
      userId,
      action: 'settings_updated',
      details: {
        settingType,
        changes,
      },
      ipAddress: request ? getClientIP(request) : undefined,
      userAgent: request?.headers.get('user-agent') || undefined,
    })
  },

  async configChanged(
    userId: string,
    configType: string,
    changes: Record<string, unknown>,
    request?: Request
  ) {
    await logAuditEvent({
      userId,
      action: 'config_changed',
      details: {
        configType,
        changes,
      },
      ipAddress: request ? getClientIP(request) : undefined,
      userAgent: request?.headers.get('user-agent') || undefined,
    })
  },
}

/**
 * Log data operations
 */
export const auditData = {
  async syncInitiated(
    userId: string,
    syncType: string,
    details?: Record<string, unknown>,
    request?: Request
  ) {
    await logAuditEvent({
      userId,
      action: 'sync_initiated',
      details: {
        syncType,
        ...details,
      },
      ipAddress: request ? getClientIP(request) : undefined,
      userAgent: request?.headers.get('user-agent') || undefined,
    })
  },

  async dataExported(
    userId: string,
    exportType: string,
    recordCount: number,
    request?: Request
  ) {
    await logAuditEvent({
      userId,
      action: 'data_exported',
      details: {
        exportType,
        recordCount,
      },
      ipAddress: request ? getClientIP(request) : undefined,
      userAgent: request?.headers.get('user-agent') || undefined,
    })
  },
}

/**
 * Retrieve audit logs with filtering
 */
export async function getAuditLogs(filter: AuditLogFilter = {}): Promise<{
  logs: AuditLog[]
  total: number
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()

    let query = supabase
      .from('audit_logs')
      .select(
        `
        id,
        user_id,
        action,
        details,
        ip_address,
        user_agent,
        timestamp,
        profiles!inner(email, first_name, last_name, role)
      `
      )
      .order('timestamp', { ascending: false })

    // Apply filters
    if (filter.userId) {
      query = query.eq('user_id', filter.userId)
    }

    if (filter.action) {
      query = query.eq('action', filter.action)
    }

    if (filter.startDate) {
      query = query.gte('timestamp', filter.startDate.toISOString())
    }

    if (filter.endDate) {
      query = query.lte('timestamp', filter.endDate.toISOString())
    }

    if (filter.ipAddress) {
      query = query.eq('ip_address', filter.ipAddress)
    }

    // Apply pagination
    if (filter.limit) {
      query = query.limit(filter.limit)
    }

    if (filter.offset) {
      query = query.range(
        filter.offset,
        filter.offset + (filter.limit || 50) - 1
      )
    }

    const { data, error, count } = await query

    if (error) {
      return { logs: [], total: 0, error: error.message }
    }

    const logs: AuditLog[] = (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      action: row.action as AuditAction,
      details: row.details || {},
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      timestamp: new Date(row.timestamp),
    }))

    return { logs, total: count || 0 }
  } catch (error) {
    console.error('Error retrieving audit logs:', error)
    return {
      logs: [],
      total: 0,
      error:
        error instanceof Error
          ? error.message
          : 'Failed to retrieve audit logs',
    }
  }
}

/**
 * Get audit log statistics
 */
export async function getAuditLogStats(days: number = 30): Promise<{
  totalEvents: number
  loginEvents: number
  configChanges: number
  userManagement: number
  dataOperations: number
  topUsers: Array<{ userId: string; email: string; eventCount: number }>
  topIPs: Array<{ ipAddress: string; eventCount: number }>
}> {
  try {
    const supabase = createServiceRoleClient()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get total events
    const { count: totalEvents } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('timestamp', startDate.toISOString())

    // Get login events
    const { count: loginEvents } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .in('action', ['user_login', 'user_logout'])
      .gte('timestamp', startDate.toISOString())

    // Get config changes
    const { count: configChanges } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .in('action', ['settings_updated', 'config_changed'])
      .gte('timestamp', startDate.toISOString())

    // Get user management events
    const { count: userManagement } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .in('action', [
        'user_invited',
        'user_activated',
        'user_deactivated',
        'role_changed',
      ])
      .gte('timestamp', startDate.toISOString())

    // Get data operations
    const { count: dataOperations } = await supabase
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .in('action', ['sync_initiated', 'data_exported'])
      .gte('timestamp', startDate.toISOString())

    return {
      totalEvents: totalEvents || 0,
      loginEvents: loginEvents || 0,
      configChanges: configChanges || 0,
      userManagement: userManagement || 0,
      dataOperations: dataOperations || 0,
      topUsers: [], // TODO: Implement aggregation queries
      topIPs: [], // TODO: Implement aggregation queries
    }
  } catch (error) {
    console.error('Error getting audit log stats:', error)
    return {
      totalEvents: 0,
      loginEvents: 0,
      configChanges: 0,
      userManagement: 0,
      dataOperations: 0,
      topUsers: [],
      topIPs: [],
    }
  }
}

/**
 * Clean up old audit logs (for data retention)
 */
export async function cleanupOldAuditLogs(
  retentionDays: number = 365
): Promise<{
  success: boolean
  deletedCount?: number
  error?: string
}> {
  try {
    const supabase = createServiceRoleClient()
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays)

    const { count, error } = await supabase
      .from('audit_logs')
      .delete()
      .lt('timestamp', cutoffDate.toISOString())

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true, deletedCount: count || 0 }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Cleanup failed',
    }
  }
}
